"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const config_1 = require("./config");
beforeAll(() => {
});
beforeEach(() => {
    // config.ENV_OVERRIDE = config.ENV.test;
});
afterEach(() => {
    config_1.config.resetCache();
    jest.restoreAllMocks();
});
//region ENVIRONMENT TESTS
(0, globals_1.test)("ENV must be local on hostname:Machine.local", () => {
    jest.spyOn(config_1.config, "getHostName").mockImplementation(() => "Machine.local");
    (0, globals_1.expect)(config_1.config.getEnv()).toBe(config_1.config.ENV.local);
});
(0, globals_1.test)("ENV must be local on hostname:localhost:8888", () => {
    jest.spyOn(config_1.config, "getHostName").mockImplementation(() => "http://localhost:8888/");
    (0, globals_1.expect)(config_1.config.getEnv()).toBe(config_1.config.ENV.local);
});
(0, globals_1.test)("ENV must be local on hostname:127.0.0.1", () => {
    jest.spyOn(config_1.config, "getHostName").mockImplementation(() => "127.0.0.1");
    (0, globals_1.expect)(config_1.config.getEnv()).toBe(config_1.config.ENV.local);
});
(0, globals_1.test)("ENV must be staging on directory:/home/app/staging.app.com/", () => {
    jest.spyOn(config_1.config, "getHostName").mockImplementation(() => "www.server.com");
    jest.spyOn(config_1.config, "getBaseDirectory").mockImplementation(() => "/home/app/staging.app.com/");
    (0, globals_1.expect)(config_1.config.getEnv()).toBe(config_1.config.ENV.staging);
});
(0, globals_1.test)("ENV must be staging on directory:/home/app/stage.app.com/", () => {
    jest.spyOn(config_1.config, "getHostName").mockImplementation(() => "www.server.com");
    jest.spyOn(config_1.config, "getBaseDirectory").mockImplementation(() => "/home/app/stage.app.com/");
    (0, globals_1.expect)(config_1.config.getEnv()).toBe(config_1.config.ENV.staging);
});
(0, globals_1.test)("ENV must be live on directory:/home/app/app.com/ and host:www.server.com", () => {
    jest.spyOn(config_1.config, "getHostName").mockImplementation(() => "www.server.com");
    jest.spyOn(config_1.config, "getBaseDirectory").mockImplementation(() => "/home/app/app.com/");
    (0, globals_1.expect)(config_1.config.getEnv()).toBe(config_1.config.ENV.live);
});
(0, globals_1.test)("ENV must be test on override", () => {
    config_1.config.ENV_OVERRIDE = config_1.config.ENV.test;
    (0, globals_1.expect)(config_1.config.getEnv()).toBe(config_1.config.ENV.test);
});
//endregion
//region CONFIG VALUES TESTS
(0, globals_1.test)("throw error if db properties is missing", () => {
    config_1.config.ENV_OVERRIDE = config_1.config.ENV.test;
    jest.spyOn(config_1.config, "getIniFile").mockImplementation(() => {
        return {
            name: "",
            local: {
                name: "local name",
            },
            staging: {
                name: "staging name",
            },
            live: {
                name: "live name",
            },
            test: {
                name: "test name",
            }
        };
    });
    (0, globals_1.expect)(() => { config_1.config.getConfig(); }).toThrow(/config properties must not be empty/);
});
function setupDefaultConfig() {
    return {
        db_host: "host_default",
        db_port: "port_default",
        db_name: "name_default",
        db_user: "user_default",
        db_pass: "pass_default",
    };
}
(0, globals_1.test)("test get custom staging custom value", () => {
    jest.spyOn(config_1.config, "getIniFile").mockImplementation(() => { return setupDefaultConfig(); });
    (0, globals_1.expect)(config_1.config.getConfig().db_host).toBe("host_default");
    jest.restoreAllMocks();
    config_1.config.resetCache();
    config_1.config.ENV_OVERRIDE = config_1.config.ENV.staging;
    let stagingConfig = setupDefaultConfig();
    stagingConfig.staging = {};
    stagingConfig.staging.db_host = "host_staging";
    stagingConfig.staging.db_name = "db_staging";
    jest.spyOn(config_1.config, "getIniFile").mockImplementation(() => { return stagingConfig; });
    (0, globals_1.expect)(config_1.config.getConfig().db_host).toBe("host_staging");
});
(0, globals_1.test)("test get custom local custom value", () => {
    jest.spyOn(config_1.config, "getIniFile").mockImplementation(() => { return setupDefaultConfig(); });
    (0, globals_1.expect)(config_1.config.getConfig().db_host).toBe("host_default");
    jest.restoreAllMocks();
    config_1.config.resetCache();
    config_1.config.ENV_OVERRIDE = config_1.config.ENV.local;
    let localConfig = setupDefaultConfig();
    localConfig.staging = {};
    localConfig.staging.db_host = "host_staging";
    localConfig.staging.db_name = "db_staging";
    localConfig.local = {};
    localConfig.local.db_host = "host_local";
    localConfig.local.db_name = "db_local";
    jest.spyOn(config_1.config, "getIniFile").mockImplementation(() => { return localConfig; });
    (0, globals_1.expect)(config_1.config.getConfig().db_host).toBe("host_local");
});
(0, globals_1.test)("test get custom live custom value", () => {
    jest.spyOn(config_1.config, "getIniFile").mockImplementation(() => { return setupDefaultConfig(); });
    (0, globals_1.expect)(config_1.config.getConfig().db_host).toBe("host_default");
    jest.restoreAllMocks();
    config_1.config.resetCache();
    config_1.config.ENV_OVERRIDE = config_1.config.ENV.live;
    let localConfig = setupDefaultConfig();
    localConfig.staging = {};
    localConfig.staging.db_host = "host_staging";
    localConfig.staging.db_name = "db_staging";
    localConfig.local = {};
    localConfig.local.db_host = "host_local";
    localConfig.local.db_name = "db_local";
    localConfig.live = {};
    localConfig.live.db_host = "host_live";
    localConfig.live.db_name = "db_live";
    jest.spyOn(config_1.config, "getIniFile").mockImplementation(() => { return localConfig; });
    (0, globals_1.expect)(config_1.config.getConfig().db_host).toBe("host_live");
});
(0, globals_1.test)("test get custom live with no default value fallback", () => {
    jest.spyOn(config_1.config, "getIniFile").mockImplementation(() => { return setupDefaultConfig(); });
    (0, globals_1.expect)(config_1.config.getConfig().db_host).toBe("host_default");
    jest.restoreAllMocks();
    config_1.config.resetCache();
    config_1.config.ENV_OVERRIDE = config_1.config.ENV.live;
    let localConfig = setupDefaultConfig();
    localConfig.staging = {};
    localConfig.staging.db_host = "host_staging";
    localConfig.staging.db_name = "db_staging";
    localConfig.local = {};
    localConfig.local.db_host = "host_local";
    localConfig.local.db_name = "db_local";
    localConfig.live = {};
    localConfig.live.db_host = "host_live";
    localConfig.live.db_name = "db_live";
    localConfig.live.admin_ip = 12345;
    jest.spyOn(config_1.config, "getIniFile").mockImplementation(() => { return localConfig; });
    (0, globals_1.expect)(config_1.config.getConfig().admin_ip).toBe(12345);
});
(0, globals_1.test)("test get custom value in live", () => {
    jest.spyOn(config_1.config, "getIniFile").mockImplementation(() => { return setupDefaultConfig(); });
    (0, globals_1.expect)(config_1.config.getConfig().db_host).toBe("host_default");
    jest.restoreAllMocks();
    config_1.config.resetCache();
    config_1.config.ENV_OVERRIDE = config_1.config.ENV.live;
    let localConfig = setupDefaultConfig();
    localConfig.live = {};
    localConfig.live.api_key = "abc-123-xyz";
    jest.spyOn(config_1.config, "getIniFile").mockImplementation(() => { return localConfig; });
    (0, globals_1.expect)(config_1.config.getCustomOption("api_key")).toBe("abc-123-xyz");
});
(0, globals_1.test)("test get custom value in live not strict return empty string", () => {
    jest.spyOn(config_1.config, "getIniFile").mockImplementation(() => { return setupDefaultConfig(); });
    (0, globals_1.expect)(config_1.config.getConfig().db_host).toBe("host_default");
    jest.restoreAllMocks();
    config_1.config.resetCache();
    config_1.config.ENV_OVERRIDE = config_1.config.ENV.live;
    let localConfig = setupDefaultConfig();
    jest.spyOn(config_1.config, "getIniFile").mockImplementation(() => { return localConfig; });
    (0, globals_1.expect)(config_1.config.getCustomOption("api_key")).toBe("");
});
(0, globals_1.test)("test get custom value in live, strict throw error", () => {
    jest.spyOn(config_1.config, "getIniFile").mockImplementation(() => { return setupDefaultConfig(); });
    (0, globals_1.expect)(config_1.config.getConfig().db_host).toBe("host_default");
    jest.restoreAllMocks();
    config_1.config.resetCache();
    config_1.config.ENV_OVERRIDE = config_1.config.ENV.live;
    let localConfig = setupDefaultConfig();
    jest.spyOn(config_1.config, "getIniFile").mockImplementation(() => { return localConfig; });
    (0, globals_1.expect)(() => { config_1.config.getCustomOption("api_key", true); }).toThrow(/unable to retrieve option_name/);
});
//endregion
