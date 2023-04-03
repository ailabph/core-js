"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.worker_trades_viewer = void 0;
const process_1 = require("process");
const tools_1 = require("./tools");
const eth_price_track_details_1 = require("./build/eth_price_track_details");
const eth_price_track_header_1 = require("./build/eth_price_track_header");
class worker_trades_viewer {
    static async run() {
        const data = new eth_price_track_details_1.eth_price_track_details();
        await data.list(" WHERE id>:last_id ", { last_id: this.lastId }, " ORDER BY id ASC LIMIT 20 ");
        for (const detail of data._dataList) {
            this.lastId = detail.id ?? 0;
            if (detail.header_id > 0) {
                const header = new eth_price_track_header_1.eth_price_track_header();
                header.id = detail.header_id ?? 0;
                await header.fetch();
                if (header.recordExists()) {
                    const symbol = `${header.token0_symbol}/${header.token1_symbol}`;
                    if (symbol === "WBNB/BUSD")
                        continue;
                    if (symbol === "WBNB/SRT")
                        continue;
                    console.log(`TRADE:${symbol}|${detail.price_usd}`);
                    await tools_1.tools.sleep(100);
                }
            }
        }
        setImmediate(() => {
            worker_trades_viewer.run().finally();
        });
    }
}
exports.worker_trades_viewer = worker_trades_viewer;
worker_trades_viewer.lastId = 0;
if (process_1.argv.includes("run_worker_trades_viewer")) {
    console.log(`trades viewer`);
    worker_trades_viewer.run().finally();
}
//# sourceMappingURL=worker_trades_viewer.js.map