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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.build = void 0;
const connection_1 = require("./connection");
const config_1 = require("./config");
const t = __importStar(require("io-ts"));
const d = __importStar(require("fp-ts/Either"));
const tools_1 = require("./tools");
const dataObject_1 = require("./dataObject");
const fs = __importStar(require("fs"));
const handlebars = __importStar(require("handlebars"));
const TableDataPropertyCodec = t.type({
    Field: t.string,
    Type: t.string,
    Null: t.string,
    Key: t.string,
    Default: t.union([t.string, t.null]),
    Extra: t.string,
});
class build {
    static run(target_dir, target_dataObject = "./dataObject", restrict_to_local = true) {
        return __awaiter(this, void 0, void 0, function* () {
            if (restrict_to_local && config_1.config.getEnv() != config_1.config.ENV.local) {
                return;
            }
            if (typeof target_dir === "undefined")
                target_dir = config_1.config.getBaseDirectory();
            let tables = yield build.getTablesInfo();
            for (let index in tables) {
                let table = tables[index];
                // console.log("creating db orm class for "+table.table_name);
                let tpl = yield fs.promises.readFile("dataObject_template.hbs", "utf-8");
                let template = handlebars.compile(tpl);
                // @ts-ignore
                table[`target_dataObject`] = target_dataObject;
                let result = template(table);
                yield fs.promises.writeFile(`${target_dir}/${table.table_name}.ts`, result);
            }
            console.log("db orm ts classes build successful");
        });
    }
    static getTablesInfo() {
        return __awaiter(this, void 0, void 0, function* () {
            tools_1.tools.BASE_DIR = build.CONFIG_LOCATION;
            build.connection = (yield connection_1.connection.getConnection());
            let tables = yield build.initiateAndRetrieveTableNames();
            for (let i = 0; i < tables.length; i++) {
                let table = yield build.retrieveTableProperties(tables[i]);
                for (let tableProperty of table.properties) {
                    table.data_properties.push(tableProperty.Field);
                    table.data_property_types[tableProperty.Field] = tableProperty.Type;
                    build.parseAndCollectKeys(table, tableProperty);
                    build.parseAndCollectPrimaryKeys(table, tableProperty);
                    build.parseAndCollectUniqueKeys(table, tableProperty);
                    build.parseAndCollectAutoIncrement(table, tableProperty);
                    build.parseAndCollectRequiredProperties(table, tableProperty);
                    build.parseAndCollectPropertiesIndex(table, tableProperty);
                    build.setObjectType(tableProperty);
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
        });
    }
    static initiateAndRetrieveTableNames() {
        return __awaiter(this, void 0, void 0, function* () {
            let result = yield connection_1.connection.execute({ sql: "SHOW TABLES" });
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
        });
    }
    static retrieveTableProperties(dataHeader) {
        return __awaiter(this, void 0, void 0, function* () {
            let result = yield connection_1.connection.execute({ sql: `DESCRIBE ${dataHeader.table_name}` });
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
        });
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
