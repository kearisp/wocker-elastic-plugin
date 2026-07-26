import {
    Controller,
    Description,
    Completion,
    Command,
    Param,
    Option
} from "@wocker/core";
import {ElasticService} from "../services/ElasticService";


@Controller()
@Description("Elastic search commands")
export class ElasticController {
    public constructor(
        protected readonly elasticService: ElasticService
    ) {}

    @Command("elastic:create [name]")
    @Description("Creates an Elasticsearch service with configurable image and credentials.")
    public async create(
        @Param("name")
        name?: string,
        @Option("image", "i")
        @Description("Container image")
        image?: string,
        @Option("container-port", "p")
        @Description("Port on which the service will be accessible on the host")
        containerPort?: number,
        @Option("user", "u")
        @Description("Username for the built-in Elasticsearch superuser")
        username?: string,
        @Option("password", "P")
        @Description("Password for the built-in Elasticsearch superuser")
        password?: string
    ): Promise<void> {
        await this.elasticService.create({
            name,
            image,
            containerPort,
            username,
            password
        });
    }

    @Command("elastic:destroy [name]")
    @Description("Destroys a specified Elasticsearch service, removing its container and data volume.")
    public async destroy(
        @Param("name")
        name?: string,
        @Option("force", "f")
        @Description("Force deletion, even if it's the default service")
        force?: boolean,
        @Option("yes", "y")
        @Description("Skip confirmation")
        yes?: boolean
    ): Promise<void> {
        await this.elasticService.destroy(name, yes, force);
        await this.elasticService.admin();
    }

    @Command("elastic:use <name>")
    @Description("Sets a specified Elasticsearch service as the default.")
    public async use(
        @Param("name")
        name: string
    ): Promise<void> {
        this.elasticService.use(name);
    }

    @Command("elastic:start [name]")
    @Description("Start Elastic search service")
    public async start(
        @Param("name")
        name?: string,
        @Option("restart", "r")
        @Description("Restarting elastic search")
        restart?: boolean
    ): Promise<void> {
        await this.elasticService.start(name, restart);
        await this.elasticService.admin();
    }

    @Command("elastic:stop [name]")
    @Description("Stop elastic search service")
    public async stop(
        @Param("name")
        name?: string
    ): Promise<void> {
        await this.elasticService.stop(name);
        await this.elasticService.admin();
    }

    @Command("elastic:upgrade [name]")
    @Description("Upgrades a specified Elasticsearch service instance.")
    public async upgrade(
        @Param("name")
        name?: string,
        @Option("image", "i")
        @Description("Container image")
        image?: string,
        @Option("container-port", "p")
        @Description("Port on which the service will be accessible on the host")
        containerPort?: number,
        @Option("user", "u")
        @Description("Username for the built-in Elasticsearch superuser")
        username?: string,
        @Option("password", "P")
        @Description("Password for the built-in Elasticsearch superuser")
        password?: string,
        @Option("enable-admin")
        @Description("Enables the Kibana admin panel")
        enableAdmin?: boolean,
        @Option("disable-admin")
        @Description("Disables the Kibana admin panel")
        disableAdmin?: boolean
    ): Promise<void> {
        await this.elasticService.upgrade(name, {
            image,
            containerPort,
            username,
            password
        });

        if(enableAdmin) {
            this.elasticService.config.admin.enabled = true;
            this.elasticService.config.save();
        }

        if(disableAdmin) {
            this.elasticService.config.admin.enabled = false;
            this.elasticService.config.save();
        }
    }

    @Command("elastic:ls")
    @Description("Lists all available Elasticsearch services.")
    public async list(): Promise<string> {
        return this.elasticService.list();
    }

    @Completion("name", "elastic:use <name>")
    @Completion("name", "elastic:start [name]")
    @Completion("name", "elastic:stop [name]")
    @Completion("name", "elastic:upgrade [name]")
    @Completion("name", "elastic:destroy [name]")
    public async getNames(): Promise<string[]> {
        return this.elasticService.config.services.map((service) => {
            return service.name;
        });
    }
}
