import {PluginConfig} from "@wocker/core";
import {Service, ServiceProps} from "./Service";


export type AdminConfig = {
    enabled: boolean;
    hostname: string;
};

export type ConfigProps = {
    default?: string;
    services?: ServiceProps[];
    admin?: Partial<AdminConfig>;
};

export class ElasticPluginConfig extends PluginConfig {
    public default?: string;
    public services: Service[];
    public admin: AdminConfig;

    public constructor(data: ConfigProps) {
        super(data);

        const {
            default: defaultService,
            services = [],
            admin: {
                enabled: adminEnabled = false,
                hostname: adminHostname = "elastic-admin.workspace"
            } = {}
        } = data;

        this.default = defaultService;
        this.services = services.map((sp) => new Service(sp));
        this.admin = {
            enabled: adminEnabled,
            hostname: adminHostname
        };
    }

    public hasService(name: string): boolean {
        const service = this.services.find((service) => {
            return service.name === name;
        });

        return !!service;
    }

    public hasDefaultService(): boolean {
        return !!this.default && this.hasService(this.default);
    }

    public addService(service: ServiceProps): void {
        this.services.push(new Service(service));
    }

    public getService(name: string): Service {
        const service = this.services.find((service) => {
            return service.name === name;
        });

        if(!service) {
            throw new Error(`Service ${name} not found`);
        }

        return service;
    }

    public getDefaultService(): Service {
        if(!this.default) {
            throw new Error("No services are installed by default");
        }

        return this.getService(this.default);
    }

    public getServiceOrDefault(name?: string): Service {
        if(!name) {
            return this.getDefaultService();
        }

        return this.getService(name);
    }

    public setService(service: Service): void {
        let exists = false;

        for(let i = 0; i < this.services.length; i++) {
            if(this.services[i].name === service.name) {
                exists = true;
                this.services[i] = service;
            }
        }

        if(!exists) {
            this.services.push(service);
        }

        if(!this.default) {
            this.default = service.name;
        }
    }

    public unsetService(name: string): void {
        this.services = this.services.filter((service) => {
            return service.name !== name;
        });

        if(this.default === name) {
            delete this.default;
        }
    }

    public toObject(): ConfigProps {
        return {
            default: this.default,
            services: this.services.length > 0
                ? this.services.map((service) => service.toObject())
                : undefined,
            admin: this.admin
        };
    }
}
