import {
    Injectable,
    PluginConfigService,
    DockerService,
    ProxyService
} from "@wocker/core";
import {promptConfirm, promptInput} from "@wocker/utils";
import CliTable from "cli-table3";
import {ElasticPluginConfig} from "../makes/ElasticPluginConfig";
import {Service, ServiceProps} from "../makes/Service";


const KIBANA_IMAGE = "docker.elastic.co/kibana/kibana:8.15.3";

@Injectable()
export class ElasticService {
    protected _config?: ElasticPluginConfig;

    public constructor(
        protected readonly dockerService: DockerService,
        protected readonly proxyService: ProxyService,
        protected readonly pluginConfigService: PluginConfigService
    ) {}

    public get config(): ElasticPluginConfig {
        if(!this._config) {
            this._config = this.pluginConfigService.getConfig(ElasticPluginConfig);
        }

        return this._config;
    }

    public async create(serviceProps: Partial<ServiceProps> = {}): Promise<void> {
        if(serviceProps.name && this.config.hasService(serviceProps.name)) {
            throw new Error(`Service "${serviceProps.name}" already exists`);
        }

        const name = serviceProps.name || await promptInput({
            required: true,
            message: "Service name",
            type: "text",
            validate: (name?: string) => {
                if(!name) {
                    return "Name is required";
                }

                if(this.config.hasService(name)) {
                    return `Service "${name}" already exists`;
                }

                return true;
            }
        });

        const image = serviceProps.image || await promptInput({
            message: "Image",
            type: "text",
            default: "docker.elastic.co/elasticsearch/elasticsearch:8.15.3"
        });

        this.config.addService({
            name,
            image,
            containerPort: serviceProps.containerPort,
            username: serviceProps.username,
            password: serviceProps.password
        });

        this.config.save();
    }

    public async upgrade(name?: string, serviceProps: Partial<ServiceProps> = {}): Promise<void> {
        const service = this.config.getServiceOrDefault(name);

        if(serviceProps.image) {
            service.image = serviceProps.image;
        }

        if(serviceProps.containerPort) {
            service.containerPort = serviceProps.containerPort;
        }

        if(serviceProps.username) {
            service.username = serviceProps.username;
        }

        if(serviceProps.password) {
            service.password = serviceProps.password;
        }

        this.config.setService(service);
        this.config.save();
    }

    public use(name: string): void {
        const service = this.config.getService(name);

        this.config.default = service.name;

        this.config.save();
    }

    public async destroy(name?: string, yes?: boolean, force?: boolean): Promise<void> {
        const service = this.config.getServiceOrDefault(name);

        if(this.config.default === service.name && !force) {
            throw new Error("Can't destroy default service");
        }

        if(!yes) {
            const confirm = await promptConfirm({
                message: `Are you sure you want to delete the "${service.name}" database? This action cannot be undone and all data will be lost.`,
                default: false
            });

            if(!confirm) {
                throw new Error("Aborted");
            }
        }

        await this.stop(service.name);

        if(await this.dockerService.hasVolume(service.volumeName)) {
            await this.dockerService.rmVolume(service.volumeName);
        }

        this.config.unsetService(service.name)
        this.config.save();
    }

    public async start(name?: string, restart?: boolean): Promise<void> {
        if(!name && !this.config.hasDefaultService()) {
            await this.create();
        }

        const service = this.config.getServiceOrDefault(name);

        let container = await this.dockerService.getContainer(service.containerName);

        if(container && restart) {
            await this.dockerService.removeContainer(service.containerName);
            container = null;
        }

        if(!container) {
            const hasAuth = !!(service.username && service.password);

            container = await this.dockerService.createContainer({
                name: service.containerName,
                image: service.image,
                restart: "always",
                ulimits: {
                    memlock: {
                        hard: -1,
                        soft: -1
                    }
                },
                env: {
                    "node.name": "elasticsearch",
                    "cluster.name": "elasticsearch",
                    "discovery.type": "single-node",
                    "bootstrap.memory_lock": "false",
                    ES_JAVA_OPTS: "-Xms512m -Xmx512m",
                    "xpack.security.enabled": hasAuth ? "true" : "false",
                    ...hasAuth ? {
                        "xpack.security.http.ssl.enabled": "false",
                        ELASTIC_PASSWORD: service.password as string
                    } : {}
                },
                volumes: [
                    `${service.volumeName}:/usr/share/elasticsearch/data`
                ],
                ports: service.containerPorts
            });
        }

        const {
            State: {
                Running
            }
        } = await container.inspect();

        if(!Running) {
            console.info(`Starting ${service.name} service...`);

            await container.start();
        }
    }

    public async stop(name?: string): Promise<void> {
        const service = this.config.getServiceOrDefault(name);

        console.info(`Stopping ${service.name}...`);

        await this.dockerService.removeContainer(service.containerName);
    }

    public async admin(): Promise<void> {
        let target: Service | undefined;

        for(const service of this.config.services) {
            try {
                const container = await this.dockerService.getContainer(service.containerName);

                if(!container) {
                    continue;
                }

                const {
                    State: {
                        Running
                    }
                } = await container.inspect();

                if(Running) {
                    target = service;
                    break;
                }
            }
            catch(ignore) {}
        }

        await this.dockerService.removeContainer(this.config.admin.hostname);

        if(!this.config.admin.enabled || !target) {
            return;
        }

        let container = await this.dockerService.getContainer(this.config.admin.hostname);

        if(!container) {
            console.info("Kibana starting...");

            await this.dockerService.pullImage(KIBANA_IMAGE);

            container = await this.dockerService.createContainer({
                name: this.config.admin.hostname,
                image: KIBANA_IMAGE,
                restart: "always",
                env: {
                    VIRTUAL_HOST: this.config.admin.hostname,
                    VIRTUAL_PORT: "5601",
                    SERVER_NAME: this.config.admin.hostname,
                    ELASTICSEARCH_HOSTS: `http://${target.containerName}:9200`,
                    ...target.username && target.password ? {
                        ELASTICSEARCH_USERNAME: target.username,
                        ELASTICSEARCH_PASSWORD: target.password
                    } : {}
                }
            });
        }

        const {
            State: {
                Running
            }
        } = await container.inspect();

        if(!Running) {
            await container.start();
            await this.proxyService.start();
        }
    }

    public list(): string {
        const table = new CliTable({
            head: [
                "Name",
                "Host",
                "Image",
                "Auth"
            ]
        });

        for(const service of this.config.services) {
            table.push([
                service.name + (service.name === this.config.default ? " (default)" : ""),
                service.containerName + (service.containerPort ? `:${service.containerPort}` : ""),
                service.image,
                service.username && service.password ? "enabled" : "disabled"
            ]);
        }

        return table.toString();
    }
}
