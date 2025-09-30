import {
    Plugin,
    PluginConfigService
} from "@wocker/core";
import {ElasticController} from "./controllers/ElasticController";
import {ElasticService} from "./services/ElasticService";


@Plugin({
    name: "elastic",
    controllers: [ElasticController],
    providers: [
        PluginConfigService,
        ElasticService
    ]
})
export default class ElasticPlugin {}
