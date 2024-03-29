
import { connection } from "./connection";
import { config } from "./config";
import { dataObject } from "./dataObject";
import { tools } from "./tools";
import { PoolConnection } from "mysql2/promise";
import * as t from "io-ts";
import * as d from "fp-ts/Either";
import * as fs from "fs";
import * as handlebars from "handlebars";
import {argv} from "process";
import {worker_price} from "./worker_price";
const readline = require('readline');

type TableDataHeader = {
    table_name:string,
    dataKeys:string[],
    dataKeysString:string,

    dataKeysPrimary:string[],
    dataKeysPrimaryString:string,

    dataKeysAutoInc:string[],
    dataKeysAutoIncString:string,

    dataKeysUnique:string[],
    dataKeysUniqueString:string,

    required:string[],
    requiredString:string,

    data_properties_index:string[],
    data_properties_indexString:string,

    data_properties:string[],
    data_propertiesString:string,

    data_property_types:{[key:string]:string},
    data_property_typesString:string,

    properties:TableDataPropertyExtended[],
}

const TableDataPropertyCodec = t.type({
    Field:t.string,
    Type:t.string,
    Null:t.string,
    Key:t.string,
    Default:t.union([t.string,t.null]),
    Extra:t.string,
});
type TableDataProperty = t.TypeOf<typeof TableDataPropertyCodec>;
type TableDataPropertyExtended = TableDataProperty & {
    object_types:string,
    default_value:string|number,
}

export class build{
    private static connection:PoolConnection;
    public static CONFIG_LOCATION = "";

    public static async run(target_dir?:string, target_dataObject:string = "./dataObject", restrict_to_local:boolean = true){
        if(restrict_to_local && config.getEnv() != config.ENV.local){
            throw new Error("unable to run orm build on a non-local environment");
        }

        if(typeof target_dir === "undefined") target_dir = config.getBaseDirectory();
        if(config.getConfig().verbose_log) console.log(`running orm build on ${target_dir}`);

        let tables = await build.getTablesInfo();
        for(let index in tables){
            let table = tables[index];
            if(config.getConfig().verbose_log) console.log("creating db orm class for "+table.table_name);
            let tpl = await fs.promises.readFile(__dirname+"/dataObject_template.hbs","utf-8");
            let template = handlebars.compile(tpl);
            // @ts-ignore
            table[`target_dataObject`] = target_dataObject;
            let result = template(table);
            await fs.promises.writeFile(`${target_dir}/${table.table_name}.ts`,result);
        }
        console.log("db orm ts classes build successful");
    }

    public static async getTablesInfo():Promise<TableDataHeader[]>{
        if(config.getConfig().verbose_log) console.log("retrieving tables information");
        build.connection = await connection.getConnection() as PoolConnection;
        let tables = await build.initiateAndRetrieveTableNames();
        if(config.getConfig().verbose_log) console.log(`found table:${tables.length}`);
        for(let i=0; i<tables.length; i++){
            if(config.getConfig().verbose_log) console.log(`processing table properties of ${tables[i].table_name}`);
            let table = await build.retrieveTableProperties(tables[i]);
            if(config.getConfig().verbose_log) console.log(`properties retrieved`);
            for(let tableProperty of table.properties){
                if(config.getConfig().verbose_log) console.log(`populating data_properties`);
                table.data_properties.push(tableProperty.Field);
                if(config.getConfig().verbose_log) console.log(`populating data_property_types`);
                table.data_property_types[tableProperty.Field] = tableProperty.Type;

                if(config.getConfig().verbose_log) console.log(`parse and collecting keys`);
                build.parseAndCollectKeys(table, tableProperty);
                if(config.getConfig().verbose_log) console.log(`parse and collecting primary keys`);
                build.parseAndCollectPrimaryKeys(table, tableProperty);
                if(config.getConfig().verbose_log) console.log(`parse and collecting unique keys`);
                build.parseAndCollectUniqueKeys(table, tableProperty);
                if(config.getConfig().verbose_log) console.log(`parse and collecting auto increment`);
                build.parseAndCollectAutoIncrement(table, tableProperty);
                if(config.getConfig().verbose_log) console.log(`parse and collecting required properties`);
                build.parseAndCollectRequiredProperties(table, tableProperty);
                if(config.getConfig().verbose_log) console.log(`parse and collecting property index`);
                build.parseAndCollectPropertiesIndex(table, tableProperty);
                if(config.getConfig().verbose_log) console.log(`setting object types`);
                build.setObjectType(tableProperty);
                if(config.getConfig().verbose_log) console.log(`setting default values`);
                build.setDefaultValues(tableProperty);
            }
            table.data_propertiesString = tools.convertArrayOfStringToString(table.data_properties,",","'");
            table.data_property_typesString = tools.convertArrayOfStringToString(table.data_property_types,",","",true);
            table.dataKeysString = tools.convertArrayOfStringToString(table.dataKeys,",","'");
            table.dataKeysPrimaryString = tools.convertArrayOfStringToString(table.dataKeysPrimary,",","'");
            table.dataKeysUniqueString = tools.convertArrayOfStringToString(table.dataKeysUnique,",","'");
            table.dataKeysAutoIncString = tools.convertArrayOfStringToString(table.dataKeysAutoInc,",","'");
            table.requiredString = tools.convertArrayOfStringToString(table.required,",","'");
            table.data_properties_indexString = tools.convertArrayOfStringToString(table.data_properties_index,",","'");
        }
        return tables;
    }

    private static async initiateAndRetrieveTableNames():Promise<TableDataHeader[]>{
        let result = await connection.execute({sql:"SHOW TABLES"}) as object[];
        let tablesData:TableDataHeader[] = [];
        for(let i=0; i<result.length; i++){
            let table:{[key:string]:any} = result[i];
            let tableHeader:TableDataHeader = {
                table_name:table[`Tables_in_${config.getConfig().db_name}`],
                dataKeys: [],
                dataKeysAutoInc: [],
                dataKeysAutoIncString: "",
                dataKeysPrimary: [],
                dataKeysPrimaryString: "",
                dataKeysString: "",
                dataKeysUnique: [],
                dataKeysUniqueString: "",
                data_properties: [],
                data_propertiesString: "",
                data_properties_index: [],
                data_properties_indexString: "",
                data_property_types: {},
                data_property_typesString: "",
                properties: [],
                required: [],
                requiredString: "",
            };
            tablesData.push(tableHeader);
        }
        return tablesData;
    }

    private static async retrieveTableProperties(dataHeader:TableDataHeader):Promise<TableDataHeader>{
        let result = await connection.execute({sql:`DESCRIBE ${dataHeader.table_name}`}) as object[];
        for(let i=0; i<result.length; i++){
            let prop = result[i];
            let propCodec = TableDataPropertyCodec.decode(prop);
            if(d.isRight(propCodec)){
                let prop = propCodec.right as TableDataPropertyExtended;
                prop.object_types = "";
                prop.default_value = "";
                dataHeader.properties.push(prop);
            }
            else{
                throw new Error("unable to retrieve table property data");
            }
        }
        return dataHeader;
    }

    private static parseAndCollectKeys(tableDataHeader:TableDataHeader, property:TableDataProperty){
        if(property.Key === "PRI" || property.Key === "UNI"){
            tableDataHeader.dataKeys.push(property.Field);
        }
    }

    private static parseAndCollectPrimaryKeys(tableDataHeader:TableDataHeader, property:TableDataProperty){
        if(property.Key === "PRI"){
            tableDataHeader.dataKeysPrimary.push(property.Field);
        }
    }

    private static parseAndCollectUniqueKeys(tableDataHeader:TableDataHeader, property:TableDataProperty){
        if(property.Key === "UNI"){
            tableDataHeader.dataKeysUnique.push(property.Field);
        }
    }

    private static parseAndCollectAutoIncrement(tableDataHeader:TableDataHeader, property:TableDataProperty){
        if(property.Extra === "auto_increment"){
            tableDataHeader.dataKeysAutoInc.push(property.Field);
        }
    }

    private static parseAndCollectRequiredProperties(tableDataHeader:TableDataHeader, property:TableDataProperty){
        if(property.Null === "NO" && property.Extra !== "auto_increment"){
            tableDataHeader.required.push(property.Field);
        }
    }

    private static parseAndCollectPropertiesIndex(tableDataHeader:TableDataHeader, property:TableDataProperty){
        if(property.Key === "MUL"){
            tableDataHeader.data_properties_index.push(property.Field);
        }
    }

    private static setObjectType(property:TableDataPropertyExtended){
        property.object_types = tools.getTypeFromSqlType(property.Type);
        if(property.Null === "YES" || property.Extra === "auto_increment"){
            property.object_types += "|null";
        }
    }

    private static setDefaultValues(property:TableDataPropertyExtended){
        if(property.object_types.includes("null")){
            property.default_value = "null";
        }
        else{
            if(property.object_types === tools.NUMBER){
                property.default_value = property.Default === null ? dataObject.UNDEFINED_NUMBER : property.Default as string;
            }
            else if(property.object_types === tools.STRING){
                property.default_value = property.Default === null ? `'${dataObject.UNDEFINED_STRING}'` : `'${property.Default as string}'`;
            }
        }
    }
}

(async()=>{
    if(argv.includes("run_build")){
        console.log(`db:${config.getConfig().db_name}`);
        console.log(`env:${config.getEnv()}`);
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        const default_dir = "build";
        let dir = await new Promise<string>(resolve => {
            console.log(`current target dir: ${default_dir}`);
            rl.question(`target dir of db classes? `, (name: string | PromiseLike<string>) => {
                resolve(name);
            });
        });
        dir = tools.isEmpty(dir) ? default_dir : dir;
        console.log(`selected dir: ${dir}`);

        const default_dataObject = "../dataObject";
        let target_dataObject = await new Promise<string>(resolve => {
            console.log(`current data object: ${default_dataObject}`);
            rl.question(`target data object? `, (name: string | PromiseLike<string>) => {
                resolve(name);
            });
        });
        target_dataObject = tools.isEmpty(target_dataObject) ? default_dataObject : target_dataObject;
        console.log(`selected data object: ${target_dataObject}`);

        build.run(dir,target_dataObject).finally();
    }
})();
