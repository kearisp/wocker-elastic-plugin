import {FileSystem} from "@wocker/core";
import {Service, ServiceProps} from "./Service";


export type ConfigProps = {
    default?: string;
    services?: ServiceProps[];
};

export abstract class Config {
    public default?: string;
    public services: Service[];

    protected constructor(props: ConfigProps) {
        const {
            default: defaultService,
            services = []
        } = props;

        this.default = defaultService;
        this.services = services.map((sp) => new Service(sp));
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

    public abstract save(): void;

    public toObject(): ConfigProps {
        return {
            default: this.default,
            services: this.services.length > 0
                ? this.services.map((service) => service.toObject())
                : undefined
        };
    }

    public static make(fs: FileSystem): Config {
        const props: ConfigProps = fs.exists("config.json")
            ? fs.readJSON("config.json")
            : {};

        return new class extends Config {
            public save(): void {
                fs.writeJSON("config.json", this.toObject());
            }
        }(props);
    }
}
