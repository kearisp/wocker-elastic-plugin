export type ServiceProps = {
    name: string;
    image: string;
    containerPort?: number;
};

export class Service {
    public name: string;
    public image: string;
    public containerPort?: number;

    public constructor(props: ServiceProps) {
        const {
            name,
            image,
            containerPort
        } = props;

        this.name = name;
        this.image = image;
        this.containerPort = containerPort;
    }

    public get containerName(): string {
        return `elastic-${this.name}.workspace`;
    }

    public get volumeName(): string {
        return `wocker-elastic-${this.name}`;
    }

    public get containerPorts(): string[] {
        if(!this.containerPort) {
            return [];
        }

        return [
            `${this.containerPort}:9200`
        ];
    }

    public toObject(): ServiceProps {
        return {
            name: this.name,
            image: this.image,
            containerPort: this.containerPort
        };
    }
}
