"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.web3_tools = void 0;
//region TYPE
var PAIR_POSITION;
(function (PAIR_POSITION) {
    PAIR_POSITION[PAIR_POSITION["zero"] = 0] = "zero";
    PAIR_POSITION[PAIR_POSITION["one"] = 1] = "one";
})(PAIR_POSITION || (PAIR_POSITION = {}));
//endregion TYPE
class web3_tools {
    static getOrderedPair(token0, token1, position, separator = "") {
        if (position === PAIR_POSITION.zero)
            return `${token0.toUpperCase()}${separator}${token1.toUpperCase()}`;
        else
            return `${token1.toUpperCase()}${separator}${token0.toUpperCase()}`;
    }
}
exports.web3_tools = web3_tools;
//# sourceMappingURL=web3_tools.js.map