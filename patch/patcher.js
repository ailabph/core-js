"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.patcher = void 0;
const ailab_core_1 = require("../ailab-core");
class patcher {
    static getPatchDirectory(of_core_module = false) {
        return ailab_core_1.config.getBaseDirectory() + "/patch";
    }
}
exports.patcher = patcher;
//# sourceMappingURL=patcher.js.map