import {
    Injectable,
    PluginConfigService,
    DockerService
} from "@wocker/core";
import {promptConfirm, promptInput} from "@wocker/utils";
import {Config} from "../makes/Config";
import {ServiceProps} from "../makes/Service";


@Injectable()
export class ElasticService {
    protected _config?: Config;

    public constructor(
        protected readonly dockerService: DockerService,
        protected readonly pluginConfigService: PluginConfigService
    ) {}

    public get config(): Config {
        if(!this._config) {
            this._config = Config.make(this.pluginConfigService.fs);
        }

        return this._config;
    }

    public async create(serviceProps: Partial<ServiceProps>): Promise<void> {
        const name = serviceProps.name || await promptInput({
            required: true,
            message: "Service name",
            type: "text"
        });

        const image = serviceProps.image || await promptInput({
            message: "Image",
            type: "text",
            default: "docker.elastic.co/elasticsearch/elasticsearch:7.5.2"
        });

        this.config.addService({
            name,
            image
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

        this.config.setService(service);
        this.config.save();
    }

    public async destroy(name?: string, yes?: boolean, force?: boolean): Promise<void> {
        const service = this.config.getServiceOrDefault(name);

        if(this.config.default === service.name && !force) {
            throw new Error("Can't destroy default service");
        }

        if(!yes) {
            const confirm = await promptConfirm({
                message: `Are you sure you want to delete the "${name}" database? This action cannot be undone and all data will be lost.`,
                default: false
            });

            if(!confirm) {
                throw new Error("Aborted");
            }
        }

        await this.stop(service.name);

        this.config.unsetService(service.name)
        this.config.save();
    }

    public async start(name?: string, restart?: boolean): Promise<void> {
        const service = this.config.getServiceOrDefault(name);

        let container = await this.dockerService.getContainer(service.containerName);

        if(container && restart) {
            await this.dockerService.removeContainer(service.containerName);
            container = null;
        }

        if(!container) {
            container = await this.dockerService.createContainer({
                name: service.containerName,
                image: service.image,
                ulimits: {
                    memlock: {
                        hard: -1,
                        soft: -1
                    }
                },
                env: {
                    "node.name": "elasticsearch",
                    "cluster.name": "elasticsearch",
                    "cluster.initial_master_nodes": "elasticsearch",
                    "bootstrap.memory_lock": "false",
                    ES_JAVA_OPTS: "-Xms512m -Xmx512m"
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
            await container.start();
        }
    }

    public async stop(name?: string): Promise<void> {
        const service = this.config.getServiceOrDefault(name);

        await this.dockerService.removeContainer(service.containerName);
    }
}
