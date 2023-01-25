import {expect, test} from '@jest/globals';
import {config} from "./ailab-core";

beforeAll(()=>{

});

beforeEach(()=>{
    // config.ENV_OVERRIDE = config.ENV.test;
});

afterEach(()=>{
    config.resetCache();
    jest.restoreAllMocks();
});

//region ENVIRONMENT TESTS
test("ENV must be local on hostname:Machine.local",()=>{
    jest.spyOn(config,"getHostName").mockImplementation(()=>"Machine.local");
    expect(config.getEnv()).toBe(config.ENV.local);
});

test("ENV must be local on hostname:localhost:8888",()=>{
    jest.spyOn(config,"getHostName").mockImplementation(()=>"http://localhost:8888/");
    expect(config.getEnv()).toBe(config.ENV.local);
});

test("ENV must be local on hostname:127.0.0.1",()=>{
    jest.spyOn(config,"getHostName").mockImplementation(()=>"127.0.0.1");
    expect(config.getEnv()).toBe(config.ENV.local);
});

test("ENV must be staging on directory:/home/app/staging.app.com/",()=>{
    jest.spyOn(config,"getHostName").mockImplementation(()=>"www.server.com");
    jest.spyOn(config,"getBaseDirectory").mockImplementation(()=>"/home/app/staging.app.com/");
    expect(config.getEnv()).toBe(config.ENV.staging);
});

test("ENV must be staging on directory:/home/app/stage.app.com/",()=>{
    jest.spyOn(config,"getHostName").mockImplementation(()=>"www.server.com");
    jest.spyOn(config,"getBaseDirectory").mockImplementation(()=>"/home/app/stage.app.com/");
    expect(config.getEnv()).toBe(config.ENV.staging);
});

test("ENV must be live on directory:/home/app/app.com/ and host:www.server.com",()=>{
    jest.spyOn(config,"getHostName").mockImplementation(()=>"www.server.com");
    jest.spyOn(config,"getBaseDirectory").mockImplementation(()=>"/home/app/app.com/");
    expect(config.getEnv()).toBe(config.ENV.live);
});

test("ENV must be test on override",()=>{
    config.ENV_OVERRIDE = config.ENV.test;
    expect(config.getEnv()).toBe(config.ENV.test);
});
//endregion

//region CONFIG VALUES TESTS
test("throw error if db properties is missing",()=>{
    config.ENV_OVERRIDE = config.ENV.test;
    jest.spyOn(config,"getIniFile").mockImplementation(()=>{
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
    expect(()=>{ config.getConfig() }).toThrow(/config properties must not be empty/);
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
test("test get custom staging custom value",()=>{
    jest.spyOn(config,"getIniFile").mockImplementation(()=>{ return setupDefaultConfig() });
    expect(config.getConfig().db_host).toBe("host_default");

    jest.restoreAllMocks();
    config.resetCache();
    config.ENV_OVERRIDE = config.ENV.staging;
    let stagingConfig:{[key: string]: any} = setupDefaultConfig();
    stagingConfig.staging = {};
    stagingConfig.staging.db_host = "host_staging";
    stagingConfig.staging.db_name = "db_staging";
    jest.spyOn(config,"getIniFile").mockImplementation(()=>{ return stagingConfig });
    expect(config.getConfig().db_host).toBe("host_staging");
});
test("test get custom local custom value",()=>{
    jest.spyOn(config,"getIniFile").mockImplementation(()=>{ return setupDefaultConfig(); });
    expect(config.getConfig().db_host).toBe("host_default");

    jest.restoreAllMocks();
    config.resetCache();
    config.ENV_OVERRIDE = config.ENV.local;
    let localConfig: any = setupDefaultConfig();
    localConfig.staging = {};
    localConfig.staging.db_host = "host_staging";
    localConfig.staging.db_name = "db_staging";
    localConfig.local = {};
    localConfig.local.db_host = "host_local";
    localConfig.local.db_name = "db_local";
    jest.spyOn(config,"getIniFile").mockImplementation(()=>{ return localConfig });
    expect(config.getConfig().db_host).toBe("host_local");
});
test("test get custom live custom value",()=>{
    jest.spyOn(config,"getIniFile").mockImplementation(()=>{ return setupDefaultConfig() });
    expect(config.getConfig().db_host).toBe("host_default");

    jest.restoreAllMocks();
    config.resetCache();
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
    jest.spyOn(config,"getIniFile").mockImplementation(()=>{ return localConfig });
    expect(config.getConfig().db_host).toBe("host_live");
});
test("test get custom live with no default value fallback",()=>{
    jest.spyOn(config,"getIniFile").mockImplementation(()=>{ return setupDefaultConfig() });
    expect(config.getConfig().db_host).toBe("host_default");

    jest.restoreAllMocks();
    config.resetCache();
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
    jest.spyOn(config,"getIniFile").mockImplementation(()=>{ return localConfig });
    expect(config.getConfig().admin_ip).toBe(12345);
});
test("test get custom value in live",()=>{
    jest.spyOn(config,"getIniFile").mockImplementation(()=>{ return setupDefaultConfig() });
    expect(config.getConfig().db_host).toBe("host_default");

    jest.restoreAllMocks();
    config.resetCache();
    config.ENV_OVERRIDE = config.ENV.live;
    let localConfig: any = setupDefaultConfig();
    localConfig.live = {};
    localConfig.live.api_key = "abc-123-xyz";
    jest.spyOn(config,"getIniFile").mockImplementation(()=>{ return localConfig });
    expect(config.getCustomOption("api_key")).toBe("abc-123-xyz");
});
test("test get custom value in live not strict return empty string",()=>{
    jest.spyOn(config,"getIniFile").mockImplementation(()=>{ return setupDefaultConfig() });
    expect(config.getConfig().db_host).toBe("host_default");

    jest.restoreAllMocks();
    config.resetCache();
    config.ENV_OVERRIDE = config.ENV.live;
    let localConfig: any = setupDefaultConfig();
    jest.spyOn(config,"getIniFile").mockImplementation(()=>{ return localConfig });
    expect(config.getCustomOption("api_key")).toBe("");
});
test("test get custom value in live, strict throw error",()=>{
    jest.spyOn(config,"getIniFile").mockImplementation(()=>{ return setupDefaultConfig() });
    expect(config.getConfig().db_host).toBe("host_default");

    jest.restoreAllMocks();
    config.resetCache();
    config.ENV_OVERRIDE = config.ENV.live;
    let localConfig: any = setupDefaultConfig();
    jest.spyOn(config,"getIniFile").mockImplementation(()=>{ return localConfig });
    expect(()=>{ config.getCustomOption("api_key",true); }).toThrow(/unable to retrieve option_name/);
});
//endregion