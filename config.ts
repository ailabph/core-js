import {tools} from "./tools";

const path = require('path');
const os = require("os");
const loadIniFile = require('read-ini-file');
const u = require("underscore");
require('dotenv').config()

export class config{

    //region FOR TESTING
    public static CONFIG_RAW_OVERRIDE: object | undefined;
    public static ENV_OVERRIDE:string | undefined;

    public static resetCache(){
        this.CONFIG_RAW_OVERRIDE = undefined;
        this.ENV_OVERRIDE = undefined;
        this.CONFIG = undefined;
        this.CONFIG_RAW = undefined;
    }
    //endregion

    static CONFIG_FILE = "config.ini.php";
    static CONFIG: config | undefined;
    static CONFIG_RAW: {[key: string]: string} | undefined;

    //region ENVIRONMENTS
    static ENV = {
        "local":"local",
        "staging":"staging",
        "live":"live",
        "test":"test",
    };
    static getEnv(): string{
        if(typeof this.ENV_OVERRIDE === "string"){
            return this.ENV_OVERRIDE;
        }

        if(
            this.getHostName().indexOf("local") >= 0
            || this.getHostName().indexOf("127.0.0.1") >= 0
        ){
            return this.ENV.local;
        }

        if(
            this.getBaseDirectory().indexOf("staging") >= 0
            || this.getBaseDirectory().indexOf("stage") >= 0
        ){
            return this.ENV.staging;
        }

        return this.ENV.live;
    }

    public static getHostName():string{
        return os.hostname();
    }

    static getBaseDirectory(): string{
        if(typeof process.env.AILAB_CONFIG_PATH !== "undefined"){
            return process.env.AILAB_CONFIG_PATH;
        }
        else{
            throw new Error("AILAB_CONFIG_PATH env value not set");
        }
        // return path.join(__dirname, tools.BASE_DIR);
    }

    //endregion

    //region INIT
    static getIniFile(){
        let path_to_ini = path.join(this.getBaseDirectory(),this.CONFIG_FILE);
        return loadIniFile.sync(path_to_ini);
    }

    static init(force_refresh = false){
        if(typeof this.CONFIG === "undefined" || force_refresh){
            this.CONFIG = new config();

            // first load all values
            this.CONFIG_RAW = this.getIniFile();
            if(typeof this.CONFIG_RAW === "undefined"){
                throw new Error("unable to load ini values into CONFIG_RAW");
            }
            for (const [key, value] of Object.entries(this.CONFIG_RAW)) {
                if(this.CONFIG.hasOwnProperty(key)){
                    this.CONFIG[key] = value;
                }
            }

            // then load environment specific value
            if(typeof this.CONFIG_RAW[this.getEnv()] !== "undefined"){
                for (const [key, value] of Object.entries(this.CONFIG_RAW[this.getEnv()])) {
                    if(this.CONFIG.hasOwnProperty(key)){
                        this.CONFIG[key] = value;
                    }
                }
            }
            this.checkCriticalConfigValues();
        }

    }

    static checkCriticalConfigValues(){
        if(typeof this.CONFIG === "undefined"){
            throw new Error("Config file is not yet initiated");
        }

        // check 1: check prepend db_values if empty
        let is_empty: string[] | string = [];
        for (const [key, value] of Object.entries(this.CONFIG)) {
            if(key.indexOf("db_") >= 0){
                if(u.isEmpty(value)){
                    is_empty.push(key);
                }
            }
        }

        if(is_empty.length > 0){
            is_empty = is_empty.join(", ");
            throw new Error("Following config properties must not be empty:"+is_empty);
        }

        // check 2: enforce staging env using staging db
        if(this.getEnv() === this.ENV.staging){
            let db_arr = this.getConfig().db_name.split("_");
            if(!db_arr.includes("staging")){
                throw new Error("On staging environment, expected to use staging database");
            }
        }

        return true;
    }
    //endregion

    //region GETTERS
    static getConfig(): config{
        this.init();
        if(typeof this.CONFIG === "undefined") throw new Error("CONFIG not yet initialized");
        return this.CONFIG;
    }

    static getConfigRaw(): { [p: string]: string }{
        this.init();
        if(typeof this.CONFIG_RAW === "undefined") throw new Error("CONFIG RAW is not loaded");
        return this.CONFIG_RAW;
    }

    static getCustomOption(option_name: string, must_have_value = false): string|number{
        this.init();

        // get Environment first then the default
        let value_to_return: string|number|undefined = undefined;

        // @ts-ignore
        if(typeof this.getConfigRaw()[this.getEnv()] !== "undefined" && typeof this.getConfigRaw()[this.getEnv()][option_name] !== "undefined"){
            // @ts-ignore
            value_to_return = this.getConfigRaw()[this.getEnv()][option_name];
        }

        if(
            typeof value_to_return === "undefined"
            && typeof this.getConfigRaw()[option_name] !== "undefined"
        ){
            value_to_return = this.getConfigRaw()[option_name];
        }

        if(typeof value_to_return === "undefined" && must_have_value){
            throw new Error("unable to retrieve option_name:"+option_name+" from config");
        }

        return value_to_return ?? "";
    }
    //endregion

    [x: string]: any;

    public db_host: string;
    public db_port: number;
    public db_name: string;
    public db_user: string;
    public db_pass: string;
    public site_url: string;
    public site_front_url: string;
    public worker_url: string;

    public site_name: string;
    public site_tagline: string;
    public site_prefix: string;
    public site_shortcode: string;
    public site_logo_box: string;
    public site_logo_wide: string;

    public maintenance_mode: boolean;
    public maintenance_mode_message: string;
    public admin_ip: string;
    public verbose_log: boolean;
    public enable_twig_cache: boolean;
    public force_stop_all_workers: boolean;

    constructor() {
        this.db_host = "";
        this.db_port = 3306;
        this.db_name = "";
        this.db_user = "";
        this.db_pass = "";
        this.site_url = "";
        this.site_front_url = "";
        this.worker_url = "";
        this.site_name = "";
        this.site_tagline = "";
        this.site_prefix = "";
        this.site_shortcode = "";
        this.site_logo_box = "";
        this.site_logo_wide = "";
        this.maintenance_mode = false;
        this.maintenance_mode_message = "";
        this.admin_ip = "";
        this.verbose_log = false;
        this.enable_twig_cache = false;
        this.force_stop_all_workers = false;
    }

}