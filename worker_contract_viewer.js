"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.worker_contract_viewer = void 0;
const process_1 = require("process");
const eth_contract_data_1 = require("./build/eth_contract_data");
const tools_1 = require("./tools");
class worker_contract_viewer {
    static async run() {
        const data = new eth_contract_data_1.eth_contract_data();
        await data.list(" WHERE id>:last_id ", { last_id: this.lastId }, " ORDER BY id ASC LIMIT 20 ");
        for (const contract of data._dataList) {
            this.lastId = contract.id ?? 0;
            if (contract.name.includes("Pancake"))
                continue;
            if (tools_1.tools.isEmpty(contract.name))
                continue;
            console.log(`${contract.name}|${contract.symbol}|${contract.decimals}|${contract.contract}`);
            await tools_1.tools.sleep(250);
        }
        setImmediate(() => {
            worker_contract_viewer.run().finally();
        });
    }
}
exports.worker_contract_viewer = worker_contract_viewer;
worker_contract_viewer.lastId = 0;
if (process_1.argv.includes("run_worker_contract_viewer")) {
    console.log(`contract viewer`);
    worker_contract_viewer.run().finally();
}
//# sourceMappingURL=worker_contract_viewer.js.map