"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dataObject = void 0;
const connection_1 = require("./connection");
const tools_1 = require("./tools");
const u = require("underscore");
class dataObject {
    constructor(bypass_transaction = false) {
        this._isNew = true;
        this._dataList = [];
        this._dataIndex = 0;
        this._table_name = "";
        this._dataKeys = [];
        this._dataKeysPrimary = [];
        this._dataKeysAutoInc = [];
        this._dataKeysUnique = [];
        this._data_properties_index = [];
        this._required = [];
        this._data_properties = [];
        this._data_property_types = {};
        this.bypass_transaction = bypass_transaction;
    }
    //#region GETTERS
    getValue(property) {
        this.propertyExists(property);
        return this[property];
    }
    getOrig(property) {
        this.propertyExists(property);
        let property_orig = property + "_orig";
        if (!this.hasOwnProperty(property_orig))
            throw new Error(`property:${property_orig} does not exist`);
        return this[property_orig];
    }
    getDefault(property) {
        this.propertyExists(property);
        let property_default = property + "_default";
        if (!this.hasOwnProperty(property_default))
            throw new Error(`property:${property_default} does not exist`);
        return this[property_default];
    }
    getTableName(forQuery = false) {
        return forQuery ? dataObject.convertToQuerySafe(this._table_name) : this._table_name;
    }
    getType(property) {
        this.propertyExists(property);
        if (!tools_1.tools.isset(this._data_property_types, property))
            throw new Error(`property:${property} does not have a type in ` + this.getTableName());
        return this._data_property_types[property].toLowerCase();
    }
    getPrimaryKey() {
        return this._dataKeysPrimary.length > 0 ? this._dataKeysPrimary[0] : false;
    }
    //#endregion
    //#region CHECKERS
    isNew() {
        return this._isNew;
    }
    recordExists() {
        return !this.isNew();
    }
    propertyExists(property) {
        if (!this._data_properties.includes(property)) {
            throw new Error(`property:${property} does not exist in ${this._table_name}`);
        }
        return true;
    }
    hasChange(property) {
        let default_value = this.getDefault(property);
        let original_value = this.getOrig(property);
        let current_value = this.getValue(property);
        if (this.isNew()) {
            return default_value !== current_value;
        }
        else {
            return original_value !== current_value;
        }
    }
    hasAnyChanges() {
        let hasChanges = false;
        for (let i = 0; i < this._data_properties.length; i++) {
            let property = this._data_properties[i];
            if (this.hasChange(property)) {
                hasChanges = true;
                break;
            }
        }
        return hasChanges;
    }
    hasValue(property) {
        this.propertyExists(property);
        if (this.hasPlaceholderValue(property)) {
            return false;
        }
        if (this.isNew()) {
            let default_value = this.getDefault(property);
            let current_value = this.getValue(property);
            return default_value !== current_value;
        }
        else {
            return this.hasChange(property);
        }
    }
    hasAnyValue() {
        let hasValue = false;
        for (let i = 0; i < this._data_properties.length; i++) {
            let property = this._data_properties[i];
            if (this.hasValue(property)) {
                hasValue = true;
                break;
            }
        }
        return hasValue;
    }
    hasPlaceholderValue(property) {
        let value = this.getValue(property);
        return value == dataObject.UNDEFINED_STRING || value == dataObject.UNDEFINED_NUMBER;
    }
    hasAutoIncPrimaryKey() {
        let primaryKey = this.getPrimaryKey();
        if (!primaryKey)
            return false;
        return this._dataKeysAutoInc.includes(primaryKey);
    }
    hasPrimaryKey() {
        return !tools_1.tools.isEmpty(this.getPrimaryKey());
    }
    isIntegerPrimaryKey(property) {
        this.propertyExists(property);
        if (!this._dataKeysPrimary.includes(property))
            return false;
        let type = tools_1.tools.getTypeFromSqlType(this.getType(property));
        return type === tools_1.tools.NUMBER;
    }
    hasIntegerPrimaryKey() {
        let primaryKey = this.getPrimaryKey();
        if (!primaryKey) {
            return false;
        }
        else {
            let type = tools_1.tools.getTypeFromSqlType(this.getType(primaryKey));
            return type === tools_1.tools.NUMBER;
        }
    }
    hasNonAutoIncIntPrimaryKey() {
        return this.hasIntegerPrimaryKey() && !this.hasAutoIncPrimaryKey();
    }
    //#endregion
    //#region QUERY ACTIONS
    buildWhereParamForQuery(throwIfNoKeys = true, property_divider = "\n\t") {
        let where = "";
        let param = {};
        for (let i = 0; i < this._dataKeysPrimary.length; i++) {
            let key = this._dataKeysPrimary[i];
            let current_value = this.getValue(key);
            if (!tools_1.tools.isEmpty(current_value) && current_value !== dataObject.UNDEFINED_NUMBER && current_value !== dataObject.UNDEFINED_STRING) {
                where += ` WHERE ${property_divider} ${this.wrapPropertyForQuery(key)}=:${key} `;
                param[key] = this.getValue(key);
                break;
            }
        }
        if (tools_1.tools.isEmpty(where)) {
            for (let i = 0; i < this._dataKeysUnique.length; i++) {
                let key = this._dataKeysUnique[i];
                if (!tools_1.tools.isEmpty(this.getValue(key)) &&
                    (this.getValue(key) !== dataObject.UNDEFINED_NUMBER && this.getValue(key) !== dataObject.UNDEFINED_STRING)) {
                    where += ` WHERE ${property_divider} ${this.wrapPropertyForQuery(key)}=:${key} `;
                    param[key] = this.getValue(key);
                    break;
                }
            }
        }
        if (tools_1.tools.isEmpty(where) && throwIfNoKeys) {
            throw new Error("No primary or unique keys to build query");
        }
        if (tools_1.tools.isEmpty(where)) {
            for (let i = 0; i < this._data_properties.length; i++) {
                let key = this._data_properties[i];
                if (!tools_1.tools.isEmpty(this.getValue(key))) {
                    if (this.getValue(key) === dataObject.UNDEFINED_NUMBER || this.getValue(key) === dataObject.UNDEFINED_STRING)
                        continue;
                    if (this.getValue(key) === this.getDefault(key))
                        continue;
                    if (tools_1.tools.isEmpty(where)) {
                        where += " WHERE ";
                    }
                    else {
                        where += " AND ";
                    }
                    where += ` ${property_divider} ${this.wrapPropertyForQuery(key)}=:${key} `;
                    param[key] = this.getValue(key);
                }
            }
        }
        return { "where": where, "param": param };
    }
    async get({ where = "", param = {}, order = "", select = " * ", join = "" }) {
        return this.getRecord({
            where: where,
            param: param,
            getAll: true,
            order: order,
            select: select,
            join: join
        });
    }
    async getRecord({ where = "", param = {}, getAll = false, order = "", select = " * ", join = "" }) {
        if (tools_1.tools.isEmpty(where)) {
            let whereParam = this.buildWhereParamForQuery(false, "");
            where = whereParam.where;
            param = whereParam.param;
        }
        if (tools_1.tools.isEmpty(where))
            return false;
        let sql = `SELECT ${select} FROM ${this.getTableName(true)} ${join} ${where} ${order} `;
        let result = await connection_1.connection.execute({ sql: sql, param: param, force_pool: this.bypass_transaction });
        let items = [];
        if (!Array.isArray(items)) {
            throw new Error("unable to retrieve record, executed query result expected to be array");
        }
        if (getAll) {
            for (let i = 0; i < result.length; i++) {
                let item = result[i];
                items.push(item);
            }
            return items;
        }
        else {
            if (result.length === 0) {
                return false;
            }
            this.loadValues(result[0]);
            this._isNew = false;
            return true;
        }
    }
    async getRecordAndLoadValues() {
        await this.getRecord({ getAll: false });
    }
    async save() {
        if (!this.hasAnyChanges())
            return;
        this.checkRequiredValues();
        if (this.isNew()) {
            await this.insert();
        }
        else {
            await this.update({});
        }
    }
    async update({ where = "", param = {} }) {
        if (!this.hasAnyChanges()) {
            throw new Error("nothing to update, property has no changes");
        }
        if (tools_1.tools.isEmpty(where)) {
            let whereParam = this.buildWhereParamForQuery(true);
            where = whereParam.where;
            param = whereParam.param;
        }
        if (tools_1.tools.isEmpty(where))
            throw new Error("Unable to update, where is empty");
        let insertSection = "";
        for (let index in this._data_properties) {
            let property = this._data_properties[index];
            if (this._dataKeysPrimary.includes(property))
                continue;
            if (this.hasChange(property)) {
                if (!tools_1.tools.isEmpty(insertSection))
                    insertSection += ", \n\t ";
                insertSection += `${this.wrapPropertyForQuery(property)}=:${property} `;
                param[property] = this[property];
            }
        }
        if (tools_1.tools.isEmpty(insertSection)) {
            throw new Error("section in sql for update is empty");
        }
        let sql = `UPDATE \n\t ${this.getTableName(true)} \n SET \n\t ${insertSection} \n ${where} `;
        let result = await connection_1.connection.execute({ sql: sql, param: param, force_pool: this.bypass_transaction });
        this.importOriginalValuesFromCurrentValues();
    }
    async insert() {
        if (!this.hasAnyValue())
            throw new Error("nothing to insert");
        let insertProperties = "";
        let insertValues = "";
        let insertParam = {};
        if (this.hasNonAutoIncIntPrimaryKey()) {
            let primaryKey = this.getPrimaryKey();
            if (!primaryKey)
                throw new Error("expected to have primary key");
            const generatePrimaryKey = performance.now() + "";
            this[primaryKey] = tools_1.tools.parseNumber(generatePrimaryKey.replace(".", ""));
        }
        for (let i = 0; i < this._data_properties.length; i++) {
            let property = this._data_properties[i];
            if (this._dataKeysAutoInc.includes(property))
                continue;
            let property_value = this.getValue(property);
            if (this.hasValue(property)) {
                if (!tools_1.tools.isEmpty(insertProperties)) {
                    insertProperties += ", ";
                    insertValues += ", ";
                }
                insertProperties += "\n\t ";
                insertValues += "\n\t ";
                insertProperties += this.wrapPropertyForQuery(property);
                insertValues += `:${property}`;
                insertParam[property] = property_value;
            }
        }
        let sql = `INSERT INTO ${this.getTableName(true)} \n (${insertProperties}) \n VALUES \n (${insertValues}) `;
        if (tools_1.tools.isEmpty(insertValues))
            throw new Error("Unable to build an insert query string");
        let result = await connection_1.connection.execute({ sql: sql, param: insertParam, force_pool: this.bypass_transaction });
        if (Array.isArray(result))
            throw new Error("unexpected array type returned on an insert query");
        if (result.insertId > 0 && this._dataKeysPrimary.length > 0) {
            let primaryKey = this.getPrimaryKey();
            if (primaryKey) {
                this[primaryKey] = result.insertId;
            }
        }
        this._isNew = false;
        this.importOriginalValuesFromCurrentValues();
    }
    async delete(permaDelete = false) {
        if (this.isNew())
            throw new Error("unable to delete a new record");
        let whereParam = this.buildWhereParamForQuery(true);
        let sql = "", param = whereParam.param;
        let hasStatus = this._data_properties.includes("status");
        if (permaDelete || !hasStatus) {
            sql = `DELETE FROM ${this.getTableName(true)} ${whereParam.where}`;
            await connection_1.connection.execute({ sql: sql, param: param, force_pool: this.bypass_transaction });
            this._isNew = true;
            this.resetAllValues();
        }
        else {
            if (this._data_properties.includes("status")) {
                sql = `UPDATE ${this.getTableName(true)} SET ${this.wrapPropertyForQuery("status")}=:status ${whereParam.where}`;
                param["status"] = "c";
                await connection_1.connection.execute({ sql: sql, param: param, force_pool: this.bypass_transaction });
                this._isNew = true;
                this.resetAllValues();
            }
            else {
                throw new Error("unable to soft delete, no status property");
            }
        }
    }
    async refresh() {
        if (this.isNew())
            return;
        await this.fetch();
    }
    //#endregion
    async fetch() {
        // return this.querySelect().catch(e=>{console.log(e);return false;});
        return await this.getRecordAndLoadValues();
    }
    async querySelect() {
        let keyResult = this.buildWhereParamFromKeysObject();
        if (keyResult.where === "") {
            for (let index in this._data_properties) {
                let prop = this._data_properties[index];
                if (dataObject.hasChanges(this, prop)) {
                    keyResult.where += " " + this.getTableName(true) + "." + dataObject.convertToQuerySafe(prop) + " = :" + prop + " \n ";
                    // @ts-ignore
                    keyResult.param[prop] = this[prop];
                }
            }
        }
        if (keyResult.where === "")
            throw new Error("unable to build where string for query");
        let query = "SELECT * FROM " + this.getTableName(true) + " WHERE " + keyResult.where;
        let result = await connection_1.connection.execute({ sql: query, param: keyResult.param, force_pool: this.bypass_transaction });
        let parsedResult = connection_1.connection.parseResultSetHeader(result);
        if (!parsedResult) {
            throw new Error("unable to execute query");
        }
        // if(parsedResult.length > 0){
        //     this.loadData(parsedResult[0]);
        //     this._isNew = false;
        // }
        return this;
    }
    buildWhereParamFromKeys(throwError = false) {
        let keyWhere = "";
        let keyParam = [];
        for (let index in this._dataKeys) {
            let prop = this._dataKeysPrimary[index];
            if (this._isNew) {
                if (dataObject.hasChanges(this, prop)) {
                    keyWhere = this.getTableName(true) + "." + dataObject.convertToQuerySafe(prop) + " = ? ";
                    keyParam.push(this[prop]);
                    break;
                }
            }
            else {
                if (this[prop] > 0 || this[prop] !== "") {
                    keyWhere = this.getTableName(true) + "." + dataObject.convertToQuerySafe(prop) + " = ? ";
                    keyParam.push(this[prop]);
                    break;
                }
            }
        }
        if (keyWhere === "" && throwError)
            throw new Error("Unable to build query with no keys");
        return {
            where: keyWhere,
            param: keyParam
        };
    }
    buildWhereParamFromKeysObject(throwError = false) {
        let keyWhere = "";
        let keyParam = {};
        for (let index in this._dataKeys) {
            let prop = this._dataKeys[index];
            if (this._isNew) {
                if (dataObject.hasChanges(this, prop)) {
                    keyWhere = `${this.getTableName(true)}.${dataObject.convertToQuerySafe(prop)}=:${prop} `;
                    keyParam[prop] = this[prop];
                    break;
                }
            }
            else {
                if (this[prop] > 0 || this[prop] !== "") {
                    keyWhere = `${this.getTableName(true)}.${dataObject.convertToQuerySafe(prop)}=:${prop} `;
                    keyParam[prop] = this[prop];
                    break;
                }
            }
        }
        if (keyWhere === "" && throwError)
            throw new Error("Unable to build query with no keys");
        return {
            where: keyWhere,
            param: keyParam,
        };
    }
    defaultValues() {
        let toLook = [
            'time_created',
            'time_generated',
            'timeeditstart',
            'time_added',
            'time_last_update',
            'time_updated'
        ];
        for (let index in this._data_properties) {
            let prop = this._data_properties[index];
            if (dataObject.hasChanges(this, prop))
                continue;
            if (toLook.indexOf(prop) >= 0) {
                if (!(this[prop] > 0)) {
                    //@ts-ignore
                    this[prop] = new Date() / 1000 | 0;
                }
            }
            if (prop === 'status') {
                this[prop] = 'o';
            }
        }
    }
    loadValues(row, isNew = false, exclude = [], manualLoad = false, strict = false) {
        this._isNew = isNew;
        for (let row_property in row) {
            let row_value = row[row_property];
            if (typeof row_value === 'object')
                row_value = JSON.stringify(row_value);
            if (!this._data_properties.includes(row_property) && strict)
                continue;
            if (!(row_property in this))
                continue;
            if (exclude.includes(row_property))
                continue;
            this[row_property] = row_value;
            if (!isNew && !manualLoad) {
                if (this._data_properties.includes(row_property)) {
                    this[`${row_property}_orig`] = row_value;
                }
            }
        }
        if ("loadFunc" in this && typeof this["loadFunc"] === "function") {
            this["loadFunc"]();
        }
    }
    getDataObj() {
        let data = {};
        for (let index in this._data_properties) {
            let prop = this._data_properties[index];
            // @ts-ignore
            data[prop] = this[prop];
        }
        return data;
    }
    getDataArray() {
        let data = [];
        for (let index in this._data_properties) {
            let prop = this._data_properties[index];
            data.push(this[prop]);
        }
        return data;
    }
    updateDefault() {
        let toLook = ['time_last_update', 'time_updated'];
        for (let index in this._data_properties) {
            let prop = this._data_properties[index];
            if (toLook.indexOf(prop) >= 0) {
                //@ts-ignore
                this[prop] = new Date() / 1000 | 0;
            }
        }
    }
    count() {
        return this._dataList.length;
    }
    getItem() {
        if (this.currentIndex() < this._dataList.length) {
            let toReturn = this._dataList[this.currentIndex()];
            this.nextIndex();
            return toReturn;
        }
        this.resetIndex();
        return false;
    }
    resetIndex() {
        this._dataIndex = 0;
    }
    currentIndex() {
        return this._dataIndex;
    }
    nextIndex() {
        this._dataIndex++;
    }
    getPropArray() {
        return this._data_properties;
    }
    resetOrigValues() {
        for (let index in this._data_properties) {
            let prop = this._data_properties[index];
            this["_orig_" + prop] = this[prop];
        }
    }
    // STATICS
    static convertToQuerySafe(prop) {
        let property_name = "";
        if (prop === undefined) {
            throw new Error("property is undefined");
        }
        property_name = "`" + prop + "`";
        return property_name;
    }
    static hasChanges(dataObj, prop) {
        let has_changes = false;
        if (!dataObj._data_properties.includes(prop)) {
            throw new Error(`dataObj:${dataObj.getTableName()} has no property:${prop}`);
        }
        if (dataObj[prop] !== dataObj["_orig_" + prop]) {
            has_changes = true;
        }
        return has_changes;
    }
    //#region UTILITIES
    wrapPropertyForQuery(prop) {
        return this.getTableName(true) + ".`" + prop + "`";
    }
    importOriginalValuesFromCurrentValues() {
        for (let index in this._data_properties) {
            let property = this._data_properties[index];
            this[`${property}_orig`] = this.getValue(property);
        }
    }
    resetAllValues() {
        for (let index in this._data_properties) {
            let property = this._data_properties[index];
            this[`${property}_default`] = this.getDefault(property);
        }
    }
    checkRequiredValues() {
        for (let index in this._required) {
            let property = this._required[index];
            if (this._dataKeysAutoInc.includes(property))
                continue;
            if (this.isIntegerPrimaryKey(property))
                continue;
            let property_type = tools_1.tools.getTypeFromSqlType(this.getType(property));
            if (property_type === tools_1.tools.NUMBER) {
                if (this.getValue(property) === dataObject.UNDEFINED_NUMBER) {
                    throw new Error(`Unable to save, property:${property} is required`);
                }
            }
            if (property === tools_1.tools.STRING) {
                if (this.getValue(property) === dataObject.UNDEFINED_STRING) {
                    throw new Error(`Unable to save, property:${property} is required`);
                }
            }
        }
    }
}
exports.dataObject = dataObject;
dataObject.UNDEFINED_STRING = "ailab_core_undefined";
dataObject.UNDEFINED_NUMBER = -987654321;
//# sourceMappingURL=dataObject.js.map