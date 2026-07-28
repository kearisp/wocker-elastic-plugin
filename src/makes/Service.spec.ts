import {describe, it, expect} from "@jest/globals";
import {Service} from "./Service";


describe("Service", (): void => {
    it("should build container/volume names from the service name", (): void => {
        const service = new Service({
            name: "test",
            image: "docker.elastic.co/elasticsearch/elasticsearch:8.15.3"
        });

        expect(service.containerName).toBe("elastic-test.workspace");
        expect(service.volumeName).toBe("wocker-elastic-test");
    });

    it("should return no port mappings when containerPort is not set", (): void => {
        const service = new Service({
            name: "test",
            image: "elasticsearch"
        });

        expect(service.containerPorts).toEqual([]);
    });

    it("should map containerPort to the default elasticsearch port", (): void => {
        const service = new Service({
            name: "test",
            image: "elasticsearch",
            containerPort: 9250
        });

        expect(service.containerPorts).toEqual(["9250:9200"]);
    });

    it("should round-trip through toObject", (): void => {
        const service = new Service({
            name: "test",
            image: "elasticsearch",
            containerPort: 9250,
            username: "elastic",
            password: "changeme"
        });

        expect(service.toObject()).toEqual({
            name: "test",
            image: "elasticsearch",
            containerPort: 9250,
            username: "elastic",
            password: "changeme"
        });
    });
});
