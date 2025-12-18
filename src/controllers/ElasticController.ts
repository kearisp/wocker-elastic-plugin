import {
    Controller,
    Description,
    Command,
    Param,
    Option
} from "@wocker/core";
import {ElasticService} from "../services/ElasticService";


@Controller()
export class ElasticController {
    public constructor(
        protected readonly elasticService: ElasticService
    ) {}

    @Command("elastic:create [name]")
    public async create(
        @Param("name")
        name?: string,
        @Option("image")
        @Description("Container image")
        image?: string,
        @Option("container-port", "p")
        @Description("Container port")
        containerPort?: number
    ): Promise<void> {
        await this.elasticService.create({
            name,
            image,
            containerPort
        });
    }

    @Command("elastic:destroy [name]")
    public async destroy(
        @Param("name")
        name?: string,
        @Option("force", "f")
        force?: boolean,
        @Option("yes", "y")
        yes?: boolean
    ): Promise<void> {
        await this.elasticService.destroy(name, yes, force);
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
    }

    @Command("elastic:stop [name]")
    @Description("Stop elastic search service")
    public async stop(
        @Param("name")
        name?: string
    ): Promise<void> {
        await this.elasticService.stop(name);
    }

    @Command("elastic:upgrade [name]")
    public async upgrade(
        @Param("name")
        name?: string,
        @Option("image", "i")
        @Description("Container image")
        image?: string,
        @Option("container-port", "p")
        @Description("Container port")
        containerPort?: number
    ): Promise<void> {
        await this.elasticService.upgrade(name, {
            image,
            containerPort
        });
    }
}
