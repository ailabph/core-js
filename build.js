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
Object.defineProperty(exports, "__esModule", { value: true });
exports.build = void 0;
const connection_1 = require("./connection");
const config_1 = require("./config");
const dataObject_1 = require("./dataObject");
const tools_1 = require("./tools");
const t = __importStar(require("io-ts"));
const d = __importStar(require("fp-ts/Either"));
const fs = __importStar(require("fs"));
const handlebars = __importStar(require("handlebars"));
const process_1 = require("process");
const readline = require('readline');
const TableDataPropertyCodec = t.type({
    Field: t.string,
    Type: t.string,
    Null: t.string,
    Key: t.string,
    Default: t.union([t.string, t.null]),
    Extra: t.string,
});
class build {
    static async run(target_dir, target_dataObject = "./dataObject", restrict_to_local = true) {
        if (restrict_to_local && config_1.config.getEnv() != config_1.config.ENV.local) {
            throw new Error("unable to run orm build on a non-local environment");
        }
        if (typeof target_dir === "undefined")
            target_dir = config_1.config.getBaseDirectory();
        if (config_1.config.getConfig().verbose_log)
            console.log(`running orm build on ${target_dir}`);
        let tables = await build.getTablesInfo();
        for (let index in tables) {
            let table = tables[index];
            if (config_1.config.getConfig().verbose_log)
                console.log("creating db orm class for " + table.table_name);
            let tpl = await fs.promises.readFile(__dirname + "/dataObject_template.hbs", "utf-8");
            let template = handlebars.compile(tpl);
            // @ts-ignore
            table[`target_dataObject`] = target_dataObject;
            let result = template(table);
            await fs.promises.writeFile(`${target_dir}/${table.table_name}.ts`, result);
        }
        console.log("db orm ts classes build successful");
    }
    static async getTablesInfo() {
        if (config_1.config.getConfig().verbose_log)
            console.log("retrieving tables information");
        build.connection = await connection_1.connection.getConnection();
        let tables = await build.initiateAndRetrieveTableNames();
        if (config_1.config.getConfig().verbose_log)
            console.log(`found table:${tables.length}`);
        for (let i = 0; i < tables.length; i++) {
            if (config_1.config.getConfig().verbose_log)
                console.log(`processing table properties of ${tables[i].table_name}`);
            let table = await build.retrieveTableProperties(tables[i]);
            if (config_1.config.getConfig().verbose_log)
                console.log(`properties retrieved`);
            for (let tableProperty of table.properties) {
                if (config_1.config.getConfig().verbose_log)
                    console.log(`populating data_properties`);
                table.data_properties.push(tableProperty.Field);
                if (config_1.config.getConfig().verbose_log)
                    console.log(`populating data_property_types`);
                table.data_property_types[tableProperty.Field] = tableProperty.Type;
                if (config_1.config.getConfig().verbose_log)
                    console.log(`parse and collecting keys`);
                build.parseAndCollectKeys(table, tableProperty);
                if (config_1.config.getConfig().verbose_log)
                    console.log(`parse and collecting primary keys`);
                build.parseAndCollectPrimaryKeys(table, tableProperty);
                if (config_1.config.getConfig().verbose_log)
                    console.log(`parse and collecting unique keys`);
                build.parseAndCollectUniqueKeys(table, tableProperty);
                if (config_1.config.getConfig().verbose_log)
                    console.log(`parse and collecting auto increment`);
                build.parseAndCollectAutoIncrement(table, tableProperty);
                if (config_1.config.getConfig().verbose_log)
                    console.log(`parse and collecting required properties`);
                build.parseAndCollectRequiredProperties(table, tableProperty);
                if (config_1.config.getConfig().verbose_log)
                    console.log(`parse and collecting property index`);
                build.parseAndCollectPropertiesIndex(table, tableProperty);
                if (config_1.config.getConfig().verbose_log)
                    console.log(`setting object types`);
                build.setObjectType(tableProperty);
                if (config_1.config.getConfig().verbose_log)
                    console.log(`setting default values`);
                build.setDefaultValues(tableProperty);
            }
            table.data_propertiesString = tools_1.tools.convertArrayOfStringToString(table.data_properties, ",", "'");
            table.data_property_typesString = tools_1.tools.convertArrayOfStringToString(table.data_property_types, ",", "", true);
            table.dataKeysString = tools_1.tools.convertArrayOfStringToString(table.dataKeys, ",", "'");
            table.dataKeysPrimaryString = tools_1.tools.convertArrayOfStringToString(table.dataKeysPrimary, ",", "'");
            table.dataKeysUniqueString = tools_1.tools.convertArrayOfStringToString(table.dataKeysUnique, ",", "'");
            table.dataKeysAutoIncString = tools_1.tools.convertArrayOfStringToString(table.dataKeysAutoInc, ",", "'");
            table.requiredString = tools_1.tools.convertArrayOfStringToString(table.required, ",", "'");
            table.data_properties_indexString = tools_1.tools.convertArrayOfStringToString(table.data_properties_index, ",", "'");
        }
        return tables;
    }
    static async initiateAndRetrieveTableNames() {
        let result = await connection_1.connection.execute({ sql: "SHOW TABLES" });
        let tablesData = [];
        for (let i = 0; i < result.length; i++) {
            let table = result[i];
            let tableHeader = {
                table_name: table[`Tables_in_${config_1.config.getConfig().db_name}`],
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
    static async retrieveTableProperties(dataHeader) {
        let result = await connection_1.connection.execute({ sql: `DESCRIBE ${dataHeader.table_name}` });
        for (let i = 0; i < result.length; i++) {
            let prop = result[i];
            let propCodec = TableDataPropertyCodec.decode(prop);
            if (d.isRight(propCodec)) {
                let prop = propCodec.right;
                prop.object_types = "";
                prop.default_value = "";
                dataHeader.properties.push(prop);
            }
            else {
                throw new Error("unable to retrieve table property data");
            }
        }
        return dataHeader;
    }
    static parseAndCollectKeys(tableDataHeader, property) {
        if (property.Key === "PRI" || property.Key === "UNI") {
            tableDataHeader.dataKeys.push(property.Field);
        }
    }
    static parseAndCollectPrimaryKeys(tableDataHeader, property) {
        if (property.Key === "PRI") {
            tableDataHeader.dataKeysPrimary.push(property.Field);
        }
    }
    static parseAndCollectUniqueKeys(tableDataHeader, property) {
        if (property.Key === "UNI") {
            tableDataHeader.dataKeysUnique.push(property.Field);
        }
    }
    static parseAndCollectAutoIncrement(tableDataHeader, property) {
        if (property.Extra === "auto_increment") {
            tableDataHeader.dataKeysAutoInc.push(property.Field);
        }
    }
    static parseAndCollectRequiredProperties(tableDataHeader, property) {
        if (property.Null === "NO" && property.Extra !== "auto_increment") {
            tableDataHeader.required.push(property.Field);
        }
    }
    static parseAndCollectPropertiesIndex(tableDataHeader, property) {
        if (property.Key === "MUL") {
            tableDataHeader.data_properties_index.push(property.Field);
        }
    }
    static setObjectType(property) {
        property.object_types = tools_1.tools.getTypeFromSqlType(property.Type);
        if (property.Null === "YES" || property.Extra === "auto_increment") {
            property.object_types += "|null";
        }
    }
    static setDefaultValues(property) {
        if (property.object_types.includes("null")) {
            property.default_value = "null";
        }
        else {
            if (property.object_types === tools_1.tools.NUMBER) {
                property.default_value = property.Default === null ? dataObject_1.dataObject.UNDEFINED_NUMBER : property.Default;
            }
            else if (property.object_types === tools_1.tools.STRING) {
                property.default_value = property.Default === null ? `'${dataObject_1.dataObject.UNDEFINED_STRING}'` : `'${property.Default}'`;
            }
        }
    }
}
exports.build = build;
build.CONFIG_LOCATION = "";
(async () => {
    if (process_1.argv.includes("run_build")) {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        const default_dir = process.cwd();
        let dir = await new Promise(resolve => {
            console.log(`current target dir: ${default_dir}`);
            rl.question(`target dir of db classes? `, (name) => {
                resolve(name);
            });
        });
        dir = tools_1.tools.isEmpty(dir) ? default_dir : dir;
        console.log(`selected dir: ${dir}`);
        const default_dataObject = "./dataObject";
        let target_dataObject = await new Promise(resolve => {
            console.log(`current data object: ${default_dataObject}`);
            rl.question(`target data object? `, (name) => {
                resolve(name);
            });
        });
        target_dataObject = tools_1.tools.isEmpty(target_dataObject) ? default_dataObject : target_dataObject;
        console.log(`selected data object: ${target_dataObject}`);
        build.run(dir, target_dataObject).finally();
    }
})();
//# sourceMappingURL=build.js.map