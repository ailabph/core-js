import * as assert from "assert";
import { config } from "./config";
import sinon from "ts-sinon";
import {expect} from "chai";
import {tools} from "./tools";

describe("config spec",()=>{
    afterEach(()=>{
        config.resetCache();
        sinon.restore();
    });

    //#region ENV TESTS
    it("ENV must be local on hostname:Machine.local",()=>{
        sinon.stub(config,"getHostName").returns("Machine.local");
        assert.equal(config.getEnv(),config.ENV["local"],"local env");
    });

    it("ENV must be local on hostname:localhost:8888",()=>{
        sinon.stub(config,"getHostName").returns("http://localhost:8888/");
        assert.equal(config.getEnv(),config.ENV["local"],"local env");
    });

    it("ENV must be local on hostname:127.0.0.1",()=>{
        sinon.stub(config,"getHostName").returns("127.0.0.1");
        assert.equal(config.getEnv(),config.ENV["local"],"local env");
    });

    it("ENV must be staging on directory:/home/app/staging.app.com/",()=>{
        sinon.stub(config,"getHostName").returns("www.server.com");
        sinon.stub(config,"getBaseDirectory").returns("/home/app/staging.app.com/");
        assert.equal(config.getEnv(),config.ENV.staging,"staging env");
    });

    it("ENV must be staging on directory:/home/app/stage.app.com/",()=>{
        sinon.stub(config,"getHostName").returns("www.server.com");
        sinon.stub(config,"getBaseDirectory").returns("/home/app/stage.app.com/");
        assert.equal(config.getEnv(),config.ENV.staging,"staging env");
    });

    it("ENV must be live on directory:/home/app/app.com/ and host:www.server.com",()=>{
        sinon.stub(config,"getHostName").returns("www.server.com");
        sinon.stub(config,"getBaseDirectory").returns("/home/app/app.com/");
        assert.equal(config.getEnv(),config.ENV.live,"live env");
    });

    it("ENV must be test on override",()=>{
        config.ENV_OVERRIDE = config.ENV.test;
        assert.equal(config.getEnv(),config.ENV.test,"test env");
    });
    //#endregion ENV TESTS


    //#region CONFIG VALUES TESTS
    it("throw error if db properties is missing",()=>{
        config.ENV_OVERRIDE = config.ENV.test;
        sinon.stub(config,"getIniFile").returns({
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
        expect(()=>{
            config.getConfig();
        }).to.throw(Error);
    });

    it("test get custom staging custom value",()=>{
        sinon.stub(config,"getIniFile").returns(setupDefaultConfig());
        assert.equal(config.getConfig().db_host,"host_default");
        sinon.restore();
        config.resetCache();
        config.ENV_OVERRIDE = config.ENV.staging;
        let stagingConfig:{[key: string]: any} = setupDefaultConfig();
        stagingConfig.staging = {};
        stagingConfig.staging.db_host = "host_staging";
        stagingConfig.staging.db_name = "db_staging";
        sinon.stub(config,"getIniFile").returns(stagingConfig);
        assert.equal(config.getConfig().db_host,"host_staging","db_host");
    });

    it("test get custom local custom value",()=>{
        let localConfig: any = setupDefaultConfig();
        localConfig.staging = {};
        localConfig.staging.db_host = "host_staging";
        localConfig.staging.db_name = "db_staging";
        localConfig.local = {};
        localConfig.local.db_host = "host_local";
        localConfig.local.db_name = "db_local";
        sinon.stub(config,"getIniFile").returns(localConfig);
        assert.equal(config.getConfig().db_host,"host_local","db_host");
    });

    it("test get custom live custom value",()=>{
        config.ENV_OVERRIDE = config.ENV.live;
        let localConfig: any = setupDefaultConfig();
        localConfig.staging = {};
        localConfig.staging.db_host = "host_staging";
        localConfig.staging.db_name = "db_staging";
        localConfig.local = {};
        localConfig.local.db_host = "host_local";
        localConfig.local.db_name = "db_local";
        localConfig.live = {};
        localConfig.live.db_host = "host_live";
        localConfig.live.db_name = "db_live";
        sinon.stub(config,"getIniFile").returns(localConfig);
        assert.equal(config.getConfig().db_host,"host_live","db_host");
    });

    it("test get custom live with no default value fallback",()=>{
        config.ENV_OVERRIDE = config.ENV.live;
        let localConfig: any = setupDefaultConfig();
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
        sinon.stub(config,"getIniFile").returns(localConfig);
        assert.equal(config.getConfig().db_host,"host_live","db_host");
    });

    it("test get custom value in live",()=>{
        config.ENV_OVERRIDE = config.ENV.live;
        let localConfig: any = setupDefaultConfig();
        localConfig.live = {};
        localConfig.live.api_key = "abc-123-xyz";
        sinon.stub(config,"getIniFile").returns(localConfig);
        assert.equal(config.getCustomOption("api_key"),"abc-123-xyz","api_key");
    });

    it("test get custom value in live not strict return empty string",()=>{
        config.ENV_OVERRIDE = config.ENV.live;
        let localConfig: any = setupDefaultConfig();
        sinon.stub(config,"getIniFile").returns(localConfig);
        assert.equal(config.getCustomOption("api_key"),"","api_key");
    });

    it("test get custom value in live, strict throw error",()=>{
        config.ENV_OVERRIDE = config.ENV.live;
        let localConfig: any = setupDefaultConfig();
        sinon.stub(config,"getIniFile").returns(localConfig);
        expect(()=>{
            config.getCustomOption("api_key",true);
        }).to.throw(Error);
    });
    //#endregion

});

function setupDefaultConfig(){
    return {
        db_host:"host_default",
        db_port:"port_default",
        db_name:"name_default",
        db_user:"user_default",
        db_pass:"pass_default",
    };
}

