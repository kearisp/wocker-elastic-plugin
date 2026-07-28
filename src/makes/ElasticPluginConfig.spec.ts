import {describe, it, expect} from "@jest/globals";
import {ElasticPluginConfig} from "./ElasticPluginConfig";
import {Service} from "./Service";


describe("ElasticPluginConfig", (): void => {
    it("should default admin to disabled with a fallback hostname", (): void => {
        const config = new ElasticPluginConfig({});

        expect(config.admin).toEqual({
            enabled: false,
            hostname: "elastic-admin.workspace"
        });
        expect(config.services).toEqual([]);
        expect(config.default).toBeUndefined();
    });

    it("should preserve admin config passed in", (): void => {
        const config = new ElasticPluginConfig({
            admin: {
                enabled: true,
                hostname: "custom-admin.workspace"
            }
        });

        expect(config.admin).toEqual({
            enabled: true,
            hostname: "custom-admin.workspace"
        });
    });

    it("addService should append a new service without touching default", (): void => {
        const config = new ElasticPluginConfig({});

        config.addService({
            name: "test",
            image: "elasticsearch"
        });

        expect(config.hasService("test")).toBe(true);
        expect(config.default).toBeUndefined();
    });

    it("getService should throw for an unknown service", (): void => {
        const config = new ElasticPluginConfig({});

        expect(() => config.getService("missing")).toThrow('Service missing not found');
    });

    it("getServiceOrDefault should throw when no default is set", (): void => {
        const config = new ElasticPluginConfig({});

        expect(() => config.getServiceOrDefault()).toThrow("No services are installed by default");
    });

    it("setService should set the first service as default", (): void => {
        const config = new ElasticPluginConfig({});

        config.setService(new Service({
            name: "first",
            image: "elasticsearch"
        }));

        expect(config.default).toBe("first");
        expect(config.getServiceOrDefault().name).toBe("first");
    });

    it("setService should replace an existing service in place", (): void => {
        const config = new ElasticPluginConfig({
            services: [
                {name: "test", image: "elasticsearch:7.5.2"}
            ]
        });

        config.setService(new Service({
            name: "test",
            image: "elasticsearch:8.15.3"
        }));

        expect(config.services).toHaveLength(1);
        expect(config.getService("test").image).toBe("elasticsearch:8.15.3");
    });

    it("unsetService should remove the service and clear default when it matches", (): void => {
        const config = new ElasticPluginConfig({
            default: "test",
            services: [
                {name: "test", image: "elasticsearch"}
            ]
        });

        config.unsetService("test");

        expect(config.hasService("test")).toBe(false);
        expect(config.default).toBeUndefined();
    });

    it("toObject should omit an empty services array", (): void => {
        const config = new ElasticPluginConfig({});

        expect(config.toObject().services).toBeUndefined();
    });
});
