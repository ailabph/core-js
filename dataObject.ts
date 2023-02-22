
import { connection } from "./connection";
import { tools } from "./tools";
const u = require("underscore");

type PrimaryWhereParam = {
    where:string,
    param:{[key:string]:any},
}

type PrimaryWhereParamObject = {
    where:string,
    param:object,
}

export abstract class dataObject{
    [x: string]: any;

    public static readonly UNDEFINED_STRING = "ailab_core_undefined";
    public static readonly UNDEFINED_NUMBER = -987654321;

    public _isNew: boolean = true;
    public _dataList: dataObject[] = [];
    private _dataIndex: number = 0;
    protected _table_name:string = "";
    protected _dataKeys: string[] = [];
    protected _dataKeysPrimary: string[] = [];
    protected _dataKeysAutoInc: string[] = [];
    protected _dataKeysUnique: string[] = [];
    protected _data_properties_index: string[] = [];
    protected _required: string[] = [];
    protected _data_properties: string[] = [];
    protected _data_property_types:{[key:string]:any} = {};
    protected bypass_transaction:boolean;

    protected constructor(bypass_transaction:boolean = false) {
        this.bypass_transaction = bypass_transaction;
    }

    //#region GETTERS

    public getValue(property:string){
        this.propertyExists(property);
        return this[property];
    }

    public getOrig(property:string){
        this.propertyExists(property);
        let property_orig = property + "_orig";
        if(!this.hasOwnProperty(property_orig)) throw new Error(`property:${property_orig} does not exist`);
        return this[property_orig];
    }

    public getDefault(property:string){
        this.propertyExists(property);
        let property_default = property + "_default";
        if(!this.hasOwnProperty(property_default)) throw new Error(`property:${property_default} does not exist`);
        return this[property_default];
    }

    public getTableName(forQuery:boolean = false):string{
        return forQuery ? dataObject.convertToQuerySafe(this._table_name) : this._table_name;
    }

    public getType(property:string){
        this.propertyExists(property);
        if(!tools.isset(this._data_property_types,property)) throw new Error(`property:${property} does not have a type in `+this.getTableName());
        return this._data_property_types[property].toLowerCase();
    }

    public getPrimaryKey():string|false{
        return this._dataKeysPrimary.length > 0 ? this._dataKeysPrimary[0] : false;
    }

    //#endregion


    //#region CHECKERS

    public isNew(): boolean{
        return this._isNew;
    }

    public recordExists(): boolean{
        return !this.isNew();
    }

    public propertyExists(property:string): boolean{
        if(!this._data_properties.includes(property)){
            throw new Error(`property:${property} does not exist in ${this._table_name}`);
        }
        return true;
    }

    public hasChange(property:string):boolean{
        let default_value = this.getDefault(property);
        let original_value = this.getOrig(property);
        let current_value = this.getValue(property);
        if(this.isNew()){
            return default_value !== current_value;
        }
        else{
            return original_value !== current_value;
        }
    }

    public hasAnyChanges(): boolean{
        let hasChanges = false;
        for(let i =0;i<this._data_properties.length;i++){
            let property = this._data_properties[i];
            if(this.hasChange(property)){
                hasChanges = true;
                break;
            }
        }
        return hasChanges;
    }

    public hasValue(property:string): boolean{
        this.propertyExists(property);
        if(this.hasPlaceholderValue(property)){
            return false;
        }
        if(this.isNew()){
            let default_value = this.getDefault(property);
            let current_value = this.getValue(property);
            return default_value !== current_value;
        }
        else{
            return this.hasChange(property);
        }
    }

    public hasAnyValue() : boolean{
        let hasValue = false;
        for(let i=0;i<this._data_properties.length;i++){
            let property = this._data_properties[i];
            if(this.hasValue(property)){
                hasValue = true;
                break;
            }
        }
        return hasValue;
    }

    public hasPlaceholderValue(property:string) : boolean{
        let value = this.getValue(property);
        return value == dataObject.UNDEFINED_STRING || value == dataObject.UNDEFINED_NUMBER;
    }

    public hasAutoIncPrimaryKey(): boolean{
        let primaryKey = this.getPrimaryKey();
        if(!primaryKey) return false;
        return this._dataKeysAutoInc.includes(primaryKey);
    }

    public hasPrimaryKey(): boolean{
        return !tools.isEmpty(this.getPrimaryKey());
    }

    public isIntegerPrimaryKey(property:string): boolean{
        this.propertyExists(property);
        if(!this._dataKeysPrimary.includes(property)) return false;
        let type = tools.getTypeFromSqlType(this.getType(property));
        return type === tools.NUMBER;
    }

    public hasIntegerPrimaryKey(): boolean{
        let primaryKey = this.getPrimaryKey();
        if(!primaryKey) {
            return false;
        }
        else{
            let type = tools.getTypeFromSqlType(this.getType(primaryKey));
            return type === tools.NUMBER;
        }
    }

    public hasNonAutoIncIntPrimaryKey(): boolean{
        return this.hasIntegerPrimaryKey() && !this.hasAutoIncPrimaryKey();
    }

    //#endregion


    //#region QUERY ACTIONS

    public buildWhereParamForQuery(throwIfNoKeys:boolean = true, property_divider:string = "\n\t") : PrimaryWhereParam{
        let where = "";
        let param : {[key:string]:any} = {};

        for(let i=0;i<this._dataKeysPrimary.length;i++){
            let key = this._dataKeysPrimary[i];
            let current_value = this.getValue(key);
            if(!tools.isEmpty(current_value) && current_value !== dataObject.UNDEFINED_NUMBER && current_value !== dataObject.UNDEFINED_STRING){
                where += ` WHERE ${property_divider} ${this.wrapPropertyForQuery(key)}=:${key} `;
                param[key] = this.getValue(key);
                break;
            }
        }

        if(tools.isEmpty(where)){
            for(let i=0;i<this._dataKeysUnique.length;i++){
                let key = this._dataKeysUnique[i];
                if( !tools.isEmpty(this.getValue(key)) &&
                    ( this.getValue(key) !== dataObject.UNDEFINED_NUMBER && this.getValue(key) !== dataObject.UNDEFINED_STRING )
                ){
                    where += ` WHERE ${property_divider} ${this.wrapPropertyForQuery(key)}=:${key} `;
                    param[key] = this.getValue(key);
                    break;
                }
            }
        }

        if(tools.isEmpty(where) && throwIfNoKeys){
            throw new Error("No primary or unique keys to build query");
        }

        if(tools.isEmpty(where)){
            for(let i=0;i<this._data_properties.length;i++){
                let key = this._data_properties[i];
                if(!tools.isEmpty(this.getValue(key))){
                    if(this.getValue(key) === dataObject.UNDEFINED_NUMBER || this.getValue(key) === dataObject.UNDEFINED_STRING) continue;
                    if(this.getValue(key) === this.getDefault(key)) continue;
                    if(tools.isEmpty(where)){
                        where += " WHERE ";
                    }
                    else{
                        where += " AND ";
                    }
                    where += ` ${property_divider} ${this.wrapPropertyForQuery(key)}=:${key} `;
                    param[key] = this.getValue(key);
                }
            }
        }

        return {"where":where,"param":param};
    }

    public async get({ where = "", param = {}, order = "", select = " * ", join = ""}:{where?:string,param?:object,order?:string,select?:string,join?:string}): Promise<object[]|boolean>{
        return this.getRecord({
            where:  where,
            param:  param,
            getAll: true,
            order:  order,
            select: select,
            join:   join
        });
    }

    public async getRecord({ where = "", param = {}, getAll = false, order = "", select = " * ", join = "" }:{where?:string,param?:object,getAll?:boolean,order?:string,select?:string,join?:string}): Promise<object[]|boolean>{
        if(tools.isEmpty(where)){
            let whereParam = this.buildWhereParamForQuery(false,"");
            where = whereParam.where;
            param = whereParam.param;
        }

        if(tools.isEmpty(where)) return false;

        let sql = `SELECT ${select} FROM ${this.getTableName(true)} ${join} ${where} ${order} `;
        let result = await connection.execute({sql:sql,param:param,force_pool:this.bypass_transaction}) as any[];

        let items: object[] | PromiseLike<object[]> = [];
        if(!Array.isArray(items)){
            throw new Error("unable to retrieve record, executed query result expected to be array");
        }

        if(getAll){
            for(let i = 0; i<result.length; i++){
                let item = result[i];
                items.push(item);
            }
            return items;
        }
        else{
            if(result.length === 0){
                return false;
            }
            this.loadValues(result[0]);
            this._isNew = false;
            return true;
        }
    }

    private async getRecordAndLoadValues(){
        await this.getRecord({getAll:false});
    }

    public async save() {
        if(!this.hasAnyChanges()) return;
        this.checkRequiredValues();
        if(this.isNew()){
            await this.insert();
        }
        else{
            await this.update({});
        }
    }

    private async update({where = "", param = {}}:{where?:string,param?:{[key:string]:any}}){
        if(!this.hasAnyChanges()){
            throw new Error("nothing to update, property has no changes");
        }
        if(tools.isEmpty(where)){
            let whereParam = this.buildWhereParamForQuery(true);
            where  = whereParam.where;
            param  = whereParam.param;
        }

        if(tools.isEmpty(where)) throw new Error("Unable to update, where is empty");

        let insertSection = "";
        for(let index in this._data_properties){
            let property = this._data_properties[index];
            if(this._dataKeysPrimary.includes(property)) continue;
            if(this.hasChange(property)){
                if(!tools.isEmpty(insertSection)) insertSection += ", \n\t ";
                insertSection += `${this.wrapPropertyForQuery(property)}=:${property} `;
                param[property] = this[property];
            }
        }

        if(tools.isEmpty(insertSection)){
            throw new Error("section in sql for update is empty");
        }

        let sql = `UPDATE \n\t ${this.getTableName(true)} \n SET \n\t ${insertSection} \n ${where} `;

        let result = await connection.execute({sql:sql,param:param,force_pool:this.bypass_transaction});
        this.importOriginalValuesFromCurrentValues();
    }

    private async insert(){
        if(!this.hasAnyValue()) throw new Error("nothing to insert");
        let insertProperties = "";
        let insertValues = "";
        let insertParam:{[key:string]:any} = {};

        if(this.hasNonAutoIncIntPrimaryKey()){
            let primaryKey = this.getPrimaryKey();
            if(!primaryKey) throw new Error("expected to have primary key");
            this[primaryKey] = Date.now();
        }

        for(let i=0; i<this._data_properties.length; i++){
            let property = this._data_properties[i];
            if(this._dataKeysAutoInc.includes(property)) continue;
            let property_value = this.getValue(property);
            if(this.hasValue(property)){
                if(!tools.isEmpty(insertProperties)){
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
        if(tools.isEmpty(insertValues)) throw new Error("Unable to build an insert query string");

        let result = await connection.execute({sql:sql,param:insertParam,force_pool:this.bypass_transaction});
        if(Array.isArray(result)) throw new Error("unexpected array type returned on an insert query");

        if(result.insertId > 0 && this._dataKeysPrimary.length > 0){
            let primaryKey = this.getPrimaryKey();
            if(primaryKey){
                this[primaryKey] = result.insertId;
            }
        }
        this._isNew = false;
        this.importOriginalValuesFromCurrentValues();
    }

    public async delete(permaDelete: boolean = false){
        if(this.isNew()) throw new Error("unable to delete a new record");

        let whereParam = this.buildWhereParamForQuery(true);
        let sql = "", param = whereParam.param;
        let hasStatus = this._data_properties.includes("status");

        if(permaDelete || !hasStatus){
            sql = `DELETE FROM ${this.getTableName(true)} ${whereParam.where}`;
            await connection.execute({sql:sql,param:param,force_pool:this.bypass_transaction});
            this._isNew = true;
            this.resetAllValues();
        }
        else {
            if(this._data_properties.includes("status")){
                sql = `UPDATE ${this.getTableName(true)} SET ${this.wrapPropertyForQuery("status")}=:status ${whereParam.where}`;
                param["status"] = "c";
                await connection.execute({sql:sql,param:param,force_pool:this.bypass_transaction});
                this._isNew = true;
                this.resetAllValues();
            }
            else{
                throw new Error("unable to soft delete, no status property");
            }
        }
    }

    public async refresh(){
        if(this.isNew()) return;
        await this.fetch();
    }

    //#endregion

    public async fetch() {
        // return this.querySelect().catch(e=>{console.log(e);return false;});
        return await this.getRecordAndLoadValues();
    }

    protected async querySelect(){

        let keyResult = this.buildWhereParamFromKeysObject();
        if(keyResult.where === ""){
            for(let index in this._data_properties){
                let prop = this._data_properties[index];
                if(dataObject.hasChanges(this,prop)){
                    keyResult.where += " "+this.getTableName(true)+"."+dataObject.convertToQuerySafe(prop)+" = :"+prop+" \n ";
                    // @ts-ignore
                    keyResult.param[prop] = this[prop];
                }
            }
        }

        if(keyResult.where === "") throw new Error("unable to build where string for query");

        let query = "SELECT * FROM " + this.getTableName(true) + " WHERE "+keyResult.where;
        let result = await connection.execute({sql:query, param:keyResult.param, force_pool:this.bypass_transaction}) as any[];
        let parsedResult = connection.parseResultSetHeader(result);
        if(!parsedResult) {
            throw new Error("unable to execute query");
        }
        // if(parsedResult.length > 0){
        //     this.loadData(parsedResult[0]);
        //     this._isNew = false;
        // }
        return this;
    }

    private buildWhereParamFromKeys(throwError: boolean = false): PrimaryWhereParam{
        let keyWhere:string = "";
        let keyParam: string[] = [];
        for(let index in this._dataKeys){
            let prop = this._dataKeysPrimary[index];
            if(this._isNew){
                if(dataObject.hasChanges(this,prop)){
                    keyWhere = this.getTableName(true)+"."+dataObject.convertToQuerySafe(prop) + " = ? ";
                    keyParam.push(this[prop]);
                    break;
                }
            }
            else{
                if(this[prop] > 0 || this[prop] !== ""){
                    keyWhere = this.getTableName(true)+"."+dataObject.convertToQuerySafe(prop) + " = ? ";
                    keyParam.push(this[prop]);
                    break;
                }
            }
        }
        if(keyWhere === "" && throwError) throw new Error("Unable to build query with no keys");
        return {
            where: keyWhere,
            param: keyParam
        }
    }

    private buildWhereParamFromKeysObject(throwError: boolean = false):PrimaryWhereParamObject{
        let keyWhere:string = "";
        let keyParam:{[key:string]:string} = {};
        for(let index in this._dataKeys){
            let prop = this._dataKeys[index];
            if(this._isNew){
                if(dataObject.hasChanges(this,prop)){
                    keyWhere = `${this.getTableName(true)}.${dataObject.convertToQuerySafe(prop)}=:${prop} `;
                    keyParam[prop] = this[prop];
                    break;
                }
            }
            else{
                if(this[prop] > 0 || this[prop] !== ""){
                    keyWhere = `${this.getTableName(true)}.${dataObject.convertToQuerySafe(prop)}=:${prop} `;
                    keyParam[prop] = this[prop];
                    break;
                }
            }
        }
        if(keyWhere === "" && throwError) throw new Error("Unable to build query with no keys");
        return{
            where: keyWhere,
            param: keyParam,
        }
    }

    private defaultValues() {
        let toLook = [
            'time_created',
            'time_generated',
            'timeeditstart',
            'time_added',
            'time_last_update',
            'time_updated'];

        for(let index in this._data_properties){
            let prop = this._data_properties[index];
            if(dataObject.hasChanges(this,prop)) continue;
            if(toLook.indexOf(prop) >= 0){
                if(!(this[prop]>0)){
                    //@ts-ignore
                    this[prop] = new Date() / 1000 | 0;
                }
            }
            if(prop === 'status'){
                this[prop] = 'o';
            }
        }
    }

    public loadValues(row: {[key:string]:any}, isNew:boolean = false, exclude:string[] = [], manualLoad:boolean = false, strict:boolean = false) {
        this._isNew = isNew;
        for(let row_property in row){
            let row_value = row[row_property];
            if(typeof row_value === 'object') row_value = JSON.stringify(row_value);
            if(!this._data_properties.includes(row_property) && strict) continue;
            if(!(row_property in this)) continue;
            if(exclude.includes(row_property)) continue;
            this[row_property] = row_value;
            if(!isNew && !manualLoad){
                if(this._data_properties.includes(row_property)){
                    this[`${row_property}_orig`] = row_value;
                }
            }
        }
        if("loadFunc" in this && typeof this["loadFunc"] === "function"){
            this["loadFunc"]();
        }
    }

    private getDataObj(): object {
        let data = {};
        for(let index in this._data_properties){
            let prop = this._data_properties[index];
            // @ts-ignore
            data[prop] = this[prop];
        }
        return data;
    }

    private getDataArray():any[] {
        let data:any[] = [];
        for(let index in this._data_properties){
            let prop = this._data_properties[index];
            data.push(this[prop]);
        }
        return data;
    }

    private updateDefault() {
        let toLook = ['time_last_update','time_updated'];
        for(let index in this._data_properties){
            let prop = this._data_properties[index];
            if(toLook.indexOf(prop) >= 0){
                //@ts-ignore
                this[prop] = new Date() / 1000 | 0;
            }
        }
    }

    public count():number {
        return this._dataList.length;
    }

    public getItem(): dataObject | false{
        if(this.currentIndex() < this._dataList.length){
            let toReturn = this._dataList[this.currentIndex()];
            this.nextIndex();
            return toReturn as dataObject;
        }
        this.resetIndex();
        return false;
    }

    protected resetIndex(){
        this._dataIndex = 0;
    }

    protected currentIndex(): number{
        return this._dataIndex;
    }

    protected nextIndex(){
        this._dataIndex++;
    }

    public getPropArray(): string[]{
        return this._data_properties;
    }

    private resetOrigValues(){
        for(let index in this._data_properties){
            let prop = this._data_properties[index];
            this["_orig_"+prop] = this[prop];
        }
    }

    // STATICS
    private static convertToQuerySafe(prop: string | undefined):string{
        let property_name = "";
        if(prop === undefined){
            throw new Error("property is undefined");
        }
        property_name = "`"+prop+"`";
        return property_name;
    }

    public static hasChanges(dataObj: dataObject, prop: string): boolean{
        let has_changes = false;
        if(!dataObj._data_properties.includes(prop)){
            throw new Error(`dataObj:${dataObj.getTableName()} has no property:${prop}`);
        }
        if(dataObj[prop] !== dataObj["_orig_"+prop]){
            has_changes = true;
        }
        return has_changes;
    }


    //#region UTILITIES

    private wrapPropertyForQuery(prop:string): string{
        return this.getTableName(true)+".`"+prop+"`";
    }

    public importOriginalValuesFromCurrentValues(){
        for(let index in this._data_properties){
            let property = this._data_properties[index];
            this[`${property}_orig`] = this.getValue(property);
        }
    }

    protected resetAllValues(){
        for(let index in this._data_properties){
            let property = this._data_properties[index];
            this[`${property}_default`] = this.getDefault(property);
        }
    }

    protected checkRequiredValues(){
        for(let index in this._required){
            let property = this._required[index];
            if(this._dataKeysAutoInc.includes(property)) continue;
            if(this.isIntegerPrimaryKey(property)) continue;
            let property_type = tools.getTypeFromSqlType(this.getType(property));
            if(property_type === tools.NUMBER){
                if(this.getValue(property) === dataObject.UNDEFINED_NUMBER) {
                    throw new Error(`Unable to save, property:${property} is required`);
                }
            }
            if(property === tools.STRING){
                if(this.getValue(property) === dataObject.UNDEFINED_STRING){
                    throw new Error(`Unable to save, property:${property} is required`);
                }
            }
        }
    }

    //#endregion
}