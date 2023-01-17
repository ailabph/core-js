"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert = __importStar(require("assert"));
const config_1 = require("./config");
const ts_sinon_1 = __importDefault(require("ts-sinon"));
const chai_1 = require("chai");
describe("config spec", () => {
    afterEach(() => {
        config_1.config.resetCache();
        ts_sinon_1.default.restore();
    });
    //#region ENV TESTS
    it("ENV must be local on hostname:Machine.local", () => {
        ts_sinon_1.default.stub(config_1.config, "getHostName").returns("Machine.local");
        assert.equal(config_1.config.getEnv(), config_1.config.ENV["local"], "local env");
    });
    it("ENV must be local on hostname:localhost:8888", () => {
        ts_sinon_1.default.stub(config_1.config, "getHostName").returns("http://localhost:8888/");
        assert.equal(config_1.config.getEnv(), config_1.config.ENV["local"], "local env");
    });
    it("ENV must be local on hostname:127.0.0.1", () => {
        ts_sinon_1.default.stub(config_1.config, "getHostName").returns("127.0.0.1");
        assert.equal(config_1.config.getEnv(), config_1.config.ENV["local"], "local env");
    });
    it("ENV must be staging on directory:/home/app/staging.app.com/", () => {
        ts_sinon_1.default.stub(config_1.config, "getHostName").returns("www.server.com");
        ts_sinon_1.default.stub(config_1.config, "getBaseDirectory").returns("/home/app/staging.app.com/");
        assert.equal(config_1.config.getEnv(), config_1.config.ENV.staging, "staging env");
    });
    it("ENV must be staging on directory:/home/app/stage.app.com/", () => {
        ts_sinon_1.default.stub(config_1.config, "getHostName").returns("www.server.com");
        ts_sinon_1.default.stub(config_1.config, "getBaseDirectory").returns("/home/app/stage.app.com/");
        assert.equal(config_1.config.getEnv(), config_1.config.ENV.staging, "staging env");
    });
    it("ENV must be live on directory:/home/app/app.com/ and host:www.server.com", () => {
        ts_sinon_1.default.stub(config_1.config, "getHostName").returns("www.server.com");
        ts_sinon_1.default.stub(config_1.config, "getBaseDirectory").returns("/home/app/app.com/");
        assert.equal(config_1.config.getEnv(), config_1.config.ENV.live, "live env");
    });
    it("ENV must be test on override", () => {
        config_1.config.ENV_OVERRIDE = config_1.config.ENV.test;
        assert.equal(config_1.config.getEnv(), config_1.config.ENV.test, "test env");
    });
    //#endregion ENV TESTS
    //#region CONFIG VALUES TESTS
    it("throw error if db properties is missing", () => {
        config_1.config.ENV_OVERRIDE = config_1.config.ENV.test;
        ts_sinon_1.default.stub(config_1.config, "getIniFile").returns({
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
        });
        (0, chai_1.expect)(() => {
            config_1.config.getConfig();
        }).to.throw(Error);
    });
    it("test get custom staging custom value", () => {
        ts_sinon_1.default.stub(config_1.config, "getIniFile").returns(setupDefaultConfig());
        assert.equal(config_1.config.getConfig().db_host, "host_default");
        ts_sinon_1.default.restore();
        config_1.config.resetCache();
        config_1.config.ENV_OVERRIDE = config_1.config.ENV.staging;
        let stagingConfig = setupDefaultConfig();
        stagingConfig.staging = {};
        stagingConfig.staging.db_host = "host_staging";
        stagingConfig.staging.db_name = "db_staging";
        ts_sinon_1.default.stub(config_1.config, "getIniFile").returns(stagingConfig);
        assert.equal(config_1.config.getConfig().db_host, "host_staging", "db_host");
    });
    it("test get custom local custom value", () => {
        let localConfig = setupDefaultConfig();
        localConfig.staging = {};
        localConfig.staging.db_host = "host_staging";
        localConfig.staging.db_name = "db_staging";
        localConfig.local = {};
        localConfig.local.db_host = "host_local";
        localConfig.local.db_name = "db_local";
        ts_sinon_1.default.stub(config_1.config, "getIniFile").returns(localConfig);
        assert.equal(config_1.config.getConfig().db_host, "host_local", "db_host");
    });
    it("test get custom live custom value", () => {
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
        ts_sinon_1.default.stub(config_1.config, "getIniFile").returns(localConfig);
        assert.equal(config_1.config.getConfig().db_host, "host_live", "db_host");
    });
    it("test get custom live with no default value fallback", () => {
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
        ts_sinon_1.default.stub(config_1.config, "getIniFile").returns(localConfig);
        assert.equal(config_1.config.getConfig().db_host, "host_live", "db_host");
    });
    it("test get custom value in live", () => {
        config_1.config.ENV_OVERRIDE = config_1.config.ENV.live;
        let localConfig = setupDefaultConfig();
        localConfig.live = {};
        localConfig.live.api_key = "abc-123-xyz";
        ts_sinon_1.default.stub(config_1.config, "getIniFile").returns(localConfig);
        assert.equal(config_1.config.getCustomOption("api_key"), "abc-123-xyz", "api_key");
    });
    it("test get custom value in live not strict return empty string", () => {
        config_1.config.ENV_OVERRIDE = config_1.config.ENV.live;
        let localConfig = setupDefaultConfig();
        ts_sinon_1.default.stub(config_1.config, "getIniFile").returns(localConfig);
        assert.equal(config_1.config.getCustomOption("api_key"), "", "api_key");
    });
    it("test get custom value in live, strict throw error", () => {
        config_1.config.ENV_OVERRIDE = config_1.config.ENV.live;
        let localConfig = setupDefaultConfig();
        ts_sinon_1.default.stub(config_1.config, "getIniFile").returns(localConfig);
        (0, chai_1.expect)(() => {
            config_1.config.getCustomOption("api_key", true);
        }).to.throw(Error);
    });
    //#endregion
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
