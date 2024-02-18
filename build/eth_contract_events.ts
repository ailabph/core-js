import {dataObject} from '../dataObject';

export class eth_contract_events extends dataObject {

    readonly PROP_id = "id";
    readonly PROP_txn_hash = "txn_hash";
    readonly PROP_blockNumber = "blockNumber";
    readonly PROP_logIndex = "logIndex";
    readonly PROP_pair_contract = "pair_contract";
    readonly PROP_type = "type";
    readonly PROP_tag = "tag";
    readonly PROP_method = "method";
    readonly PROP_log_method = "log_method";
    readonly PROP_txn_caller = "txn_caller";
    readonly PROP_fromAddress = "fromAddress";
    readonly PROP_fromContract = "fromContract";
    readonly PROP_fromSymbol = "fromSymbol";
    readonly PROP_fromDecimal = "fromDecimal";
    readonly PROP_fromValue = "fromValue";
    readonly PROP_fromAmount = "fromAmount";
    readonly PROP_fromAmountGross = "fromAmountGross";
    readonly PROP_fromTaxAmount = "fromTaxAmount";
    readonly PROP_fromTaxPerc = "fromTaxPerc";
    readonly PROP_toAddress = "toAddress";
    readonly PROP_toContract = "toContract";
    readonly PROP_toSymbol = "toSymbol";
    readonly PROP_toDecimal = "toDecimal";
    readonly PROP_toValue = "toValue";
    readonly PROP_toAmount = "toAmount";
    readonly PROP_toAmountGross = "toAmountGross";
    readonly PROP_toTaxAmount = "toTaxAmount";
    readonly PROP_toTaxPerc = "toTaxPerc";
    readonly PROP_tax_amount = "tax_amount";
    readonly PROP_tax_percentage = "tax_percentage";
    readonly PROP_block_time = "block_time";
    readonly PROP_bnb_involved = "bnb_involved";
    readonly PROP_bnb_price = "bnb_price";
    readonly PROP_token_bnb_price_estimate = "token_bnb_price_estimate";
    readonly PROP_time_processed = "time_processed";
    readonly PROP_time_stake_processed = "time_stake_processed";
    readonly PROP_process_tag = "process_tag";
    readonly PROP_total_token_given = "total_token_given";
    readonly PROP_total_gas_used = "total_gas_used";
    readonly PROP_bnb_usd = "bnb_usd";
    readonly PROP_token_bnb = "token_bnb";
    readonly PROP_token_usd = "token_usd";
    readonly PROP_token_bnb_value = "token_bnb_value";
    readonly PROP_token_usd_value = "token_usd_value";
    readonly PROP_time_strategy_processed = "time_strategy_processed";
    readonly PROP_time_balance_processed = "time_balance_processed";
    readonly PROP_time_ohlc_processed = "time_ohlc_processed";

    override _table_name = "eth_contract_events";
    override _dataKeys: string[] = ['id'];
    override _dataKeysPrimary: string[] = ['id'];
    override _dataKeysAutoInc: string[] = ['id'];
    override _dataKeysUnique: string[] = [];
    override _data_properties_index: string[] = ['txn_hash','blockNumber','logIndex','pair_contract','txn_caller','time_balance_processed'];
    override _required: string[] = ['txn_caller'];
    override _data_properties: string[] = ['id','txn_hash','blockNumber','logIndex','pair_contract','type','tag','method','log_method','txn_caller','fromAddress','fromContract','fromSymbol','fromDecimal','fromValue','fromAmount','fromAmountGross','fromTaxAmount','fromTaxPerc','toAddress','toContract','toSymbol','toDecimal','toValue','toAmount','toAmountGross','toTaxAmount','toTaxPerc','tax_amount','tax_percentage','block_time','bnb_involved','bnb_price','token_bnb_price_estimate','time_processed','time_stake_processed','process_tag','total_token_given','total_gas_used','bnb_usd','token_bnb','token_usd','token_bnb_value','token_usd_value','time_strategy_processed','time_balance_processed','time_ohlc_processed'];
    override _data_property_types = { id:"int(11)", txn_hash:"varchar(255)", blockNumber:"int(11)", logIndex:"int(11)", pair_contract:"varchar(255)", type:"varchar(60)", tag:"varchar(60)", method:"varchar(60)", log_method:"varchar(255)", txn_caller:"varchar(100)", fromAddress:"varchar(255)", fromContract:"varchar(255)", fromSymbol:"varchar(10)", fromDecimal:"int(11)", fromValue:"varchar(255)", fromAmount:"varchar(255)", fromAmountGross:"varchar(255)", fromTaxAmount:"varchar(255)", fromTaxPerc:"varchar(10)", toAddress:"varchar(255)", toContract:"varchar(255)", toSymbol:"varchar(10)", toDecimal:"int(11)", toValue:"varchar(255)", toAmount:"varchar(255)", toAmountGross:"varchar(255)", toTaxAmount:"varchar(255)", toTaxPerc:"varchar(10)", tax_amount:"varchar(255)", tax_percentage:"decimal(16,4)", block_time:"int(11)", bnb_involved:"varchar(255)", bnb_price:"varchar(255)", token_bnb_price_estimate:"varchar(255)", time_processed:"int(11)", time_stake_processed:"int(11)", process_tag:"varchar(60)", total_token_given:"varchar(255)", total_gas_used:"varchar(255)", bnb_usd:"varchar(255)", token_bnb:"varchar(255)", token_usd:"varchar(255)", token_bnb_value:"varchar(255)", token_usd_value:"varchar(255)", time_strategy_processed:"int(11)", time_balance_processed:"int(11)", time_ohlc_processed:"int(11)" };

    protected use_secondary_connection:boolean = false;

    public id: number|null;
    protected id_orig: number|null;
    protected id_default: number|null;

    public txn_hash: string|null;
    protected txn_hash_orig: string|null;
    protected txn_hash_default: string|null;

    public blockNumber: number|null;
    protected blockNumber_orig: number|null;
    protected blockNumber_default: number|null;

    public logIndex: number|null;
    protected logIndex_orig: number|null;
    protected logIndex_default: number|null;

    public pair_contract: string|null;
    protected pair_contract_orig: string|null;
    protected pair_contract_default: string|null;

    public type: string|null;
    protected type_orig: string|null;
    protected type_default: string|null;

    public tag: string|null;
    protected tag_orig: string|null;
    protected tag_default: string|null;

    public method: string|null;
    protected method_orig: string|null;
    protected method_default: string|null;

    public log_method: string|null;
    protected log_method_orig: string|null;
    protected log_method_default: string|null;

    public txn_caller: string;
    protected txn_caller_orig: string;
    protected txn_caller_default: string;

    public fromAddress: string|null;
    protected fromAddress_orig: string|null;
    protected fromAddress_default: string|null;

    public fromContract: string|null;
    protected fromContract_orig: string|null;
    protected fromContract_default: string|null;

    public fromSymbol: string|null;
    protected fromSymbol_orig: string|null;
    protected fromSymbol_default: string|null;

    public fromDecimal: number|null;
    protected fromDecimal_orig: number|null;
    protected fromDecimal_default: number|null;

    public fromValue: string|null;
    protected fromValue_orig: string|null;
    protected fromValue_default: string|null;

    public fromAmount: string|null;
    protected fromAmount_orig: string|null;
    protected fromAmount_default: string|null;

    public fromAmountGross: string|null;
    protected fromAmountGross_orig: string|null;
    protected fromAmountGross_default: string|null;

    public fromTaxAmount: string|null;
    protected fromTaxAmount_orig: string|null;
    protected fromTaxAmount_default: string|null;

    public fromTaxPerc: string|null;
    protected fromTaxPerc_orig: string|null;
    protected fromTaxPerc_default: string|null;

    public toAddress: string|null;
    protected toAddress_orig: string|null;
    protected toAddress_default: string|null;

    public toContract: string|null;
    protected toContract_orig: string|null;
    protected toContract_default: string|null;

    public toSymbol: string|null;
    protected toSymbol_orig: string|null;
    protected toSymbol_default: string|null;

    public toDecimal: number|null;
    protected toDecimal_orig: number|null;
    protected toDecimal_default: number|null;

    public toValue: string|null;
    protected toValue_orig: string|null;
    protected toValue_default: string|null;

    public toAmount: string|null;
    protected toAmount_orig: string|null;
    protected toAmount_default: string|null;

    public toAmountGross: string|null;
    protected toAmountGross_orig: string|null;
    protected toAmountGross_default: string|null;

    public toTaxAmount: string|null;
    protected toTaxAmount_orig: string|null;
    protected toTaxAmount_default: string|null;

    public toTaxPerc: string|null;
    protected toTaxPerc_orig: string|null;
    protected toTaxPerc_default: string|null;

    public tax_amount: string|null;
    protected tax_amount_orig: string|null;
    protected tax_amount_default: string|null;

    public tax_percentage: number|null;
    protected tax_percentage_orig: number|null;
    protected tax_percentage_default: number|null;

    public block_time: number|null;
    protected block_time_orig: number|null;
    protected block_time_default: number|null;

    public bnb_involved: string|null;
    protected bnb_involved_orig: string|null;
    protected bnb_involved_default: string|null;

    public bnb_price: string|null;
    protected bnb_price_orig: string|null;
    protected bnb_price_default: string|null;

    public token_bnb_price_estimate: string|null;
    protected token_bnb_price_estimate_orig: string|null;
    protected token_bnb_price_estimate_default: string|null;

    public time_processed: number|null;
    protected time_processed_orig: number|null;
    protected time_processed_default: number|null;

    public time_stake_processed: number|null;
    protected time_stake_processed_orig: number|null;
    protected time_stake_processed_default: number|null;

    public process_tag: string|null;
    protected process_tag_orig: string|null;
    protected process_tag_default: string|null;

    public total_token_given: string|null;
    protected total_token_given_orig: string|null;
    protected total_token_given_default: string|null;

    public total_gas_used: string|null;
    protected total_gas_used_orig: string|null;
    protected total_gas_used_default: string|null;

    public bnb_usd: string|null;
    protected bnb_usd_orig: string|null;
    protected bnb_usd_default: string|null;

    public token_bnb: string|null;
    protected token_bnb_orig: string|null;
    protected token_bnb_default: string|null;

    public token_usd: string|null;
    protected token_usd_orig: string|null;
    protected token_usd_default: string|null;

    public token_bnb_value: string|null;
    protected token_bnb_value_orig: string|null;
    protected token_bnb_value_default: string|null;

    public token_usd_value: string|null;
    protected token_usd_value_orig: string|null;
    protected token_usd_value_default: string|null;

    public time_strategy_processed: number|null;
    protected time_strategy_processed_orig: number|null;
    protected time_strategy_processed_default: number|null;

    public time_balance_processed: number|null;
    protected time_balance_processed_orig: number|null;
    protected time_balance_processed_default: number|null;

    public time_ohlc_processed: number|null;
    protected time_ohlc_processed_orig: number|null;
    protected time_ohlc_processed_default: number|null;


    constructor(bypass_transaction:boolean = false) {
        super(bypass_transaction);

        this.id = null;
        this.id_orig = null;
        this.id_default = null;

        this.txn_hash = null;
        this.txn_hash_orig = null;
        this.txn_hash_default = null;

        this.blockNumber = null;
        this.blockNumber_orig = null;
        this.blockNumber_default = null;

        this.logIndex = null;
        this.logIndex_orig = null;
        this.logIndex_default = null;

        this.pair_contract = null;
        this.pair_contract_orig = null;
        this.pair_contract_default = null;

        this.type = null;
        this.type_orig = null;
        this.type_default = null;

        this.tag = null;
        this.tag_orig = null;
        this.tag_default = null;

        this.method = null;
        this.method_orig = null;
        this.method_default = null;

        this.log_method = null;
        this.log_method_orig = null;
        this.log_method_default = null;

        this.txn_caller = 'ailab_core_undefined';
        this.txn_caller_orig = 'ailab_core_undefined';
        this.txn_caller_default = 'ailab_core_undefined';

        this.fromAddress = null;
        this.fromAddress_orig = null;
        this.fromAddress_default = null;

        this.fromContract = null;
        this.fromContract_orig = null;
        this.fromContract_default = null;

        this.fromSymbol = null;
        this.fromSymbol_orig = null;
        this.fromSymbol_default = null;

        this.fromDecimal = null;
        this.fromDecimal_orig = null;
        this.fromDecimal_default = null;

        this.fromValue = null;
        this.fromValue_orig = null;
        this.fromValue_default = null;

        this.fromAmount = null;
        this.fromAmount_orig = null;
        this.fromAmount_default = null;

        this.fromAmountGross = null;
        this.fromAmountGross_orig = null;
        this.fromAmountGross_default = null;

        this.fromTaxAmount = null;
        this.fromTaxAmount_orig = null;
        this.fromTaxAmount_default = null;

        this.fromTaxPerc = null;
        this.fromTaxPerc_orig = null;
        this.fromTaxPerc_default = null;

        this.toAddress = null;
        this.toAddress_orig = null;
        this.toAddress_default = null;

        this.toContract = null;
        this.toContract_orig = null;
        this.toContract_default = null;

        this.toSymbol = null;
        this.toSymbol_orig = null;
        this.toSymbol_default = null;

        this.toDecimal = null;
        this.toDecimal_orig = null;
        this.toDecimal_default = null;

        this.toValue = null;
        this.toValue_orig = null;
        this.toValue_default = null;

        this.toAmount = null;
        this.toAmount_orig = null;
        this.toAmount_default = null;

        this.toAmountGross = null;
        this.toAmountGross_orig = null;
        this.toAmountGross_default = null;

        this.toTaxAmount = null;
        this.toTaxAmount_orig = null;
        this.toTaxAmount_default = null;

        this.toTaxPerc = null;
        this.toTaxPerc_orig = null;
        this.toTaxPerc_default = null;

        this.tax_amount = null;
        this.tax_amount_orig = null;
        this.tax_amount_default = null;

        this.tax_percentage = null;
        this.tax_percentage_orig = null;
        this.tax_percentage_default = null;

        this.block_time = null;
        this.block_time_orig = null;
        this.block_time_default = null;

        this.bnb_involved = null;
        this.bnb_involved_orig = null;
        this.bnb_involved_default = null;

        this.bnb_price = null;
        this.bnb_price_orig = null;
        this.bnb_price_default = null;

        this.token_bnb_price_estimate = null;
        this.token_bnb_price_estimate_orig = null;
        this.token_bnb_price_estimate_default = null;

        this.time_processed = null;
        this.time_processed_orig = null;
        this.time_processed_default = null;

        this.time_stake_processed = null;
        this.time_stake_processed_orig = null;
        this.time_stake_processed_default = null;

        this.process_tag = null;
        this.process_tag_orig = null;
        this.process_tag_default = null;

        this.total_token_given = null;
        this.total_token_given_orig = null;
        this.total_token_given_default = null;

        this.total_gas_used = null;
        this.total_gas_used_orig = null;
        this.total_gas_used_default = null;

        this.bnb_usd = null;
        this.bnb_usd_orig = null;
        this.bnb_usd_default = null;

        this.token_bnb = null;
        this.token_bnb_orig = null;
        this.token_bnb_default = null;

        this.token_usd = null;
        this.token_usd_orig = null;
        this.token_usd_default = null;

        this.token_bnb_value = null;
        this.token_bnb_value_orig = null;
        this.token_bnb_value_default = null;

        this.token_usd_value = null;
        this.token_usd_value_orig = null;
        this.token_usd_value_default = null;

        this.time_strategy_processed = null;
        this.time_strategy_processed_orig = null;
        this.time_strategy_processed_default = null;

        this.time_balance_processed = null;
        this.time_balance_processed_orig = null;
        this.time_balance_processed_default = null;

        this.time_ohlc_processed = null;
        this.time_ohlc_processed_orig = null;
        this.time_ohlc_processed_default = null;

    }

    async list(where: string, param: {[key:string]:any} = {}, order: string = "") {
        let result = await this.get({where:where,param:param,order:order});
        if(typeof result === "boolean"){
            throw new Error("list query result expect array, boolean returned");
        }
        else{
            let itemClass = eth_contract_events;
            for(let x=0; x < result.length; x++){
                let item = new itemClass();
                item.loadValues(result[x]);
                item.importOriginalValuesFromCurrentValues();
                item._isNew = false;
                this._dataList.push(item);
            }
        }
    }

    public getItem(): eth_contract_events {
        return super.getItem() as eth_contract_events;
    }
}
