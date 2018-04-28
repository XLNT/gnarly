"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
exports.__esModule = true;
var utils_1 = require("../utils");
var Transaction_1 = require("./Transaction");
exports.isInternalTransaction = function (obj) { return 'internal' in obj; };
var InternalTransaction = /** @class */ (function (_super) {
    __extends(InternalTransaction, _super);
    function InternalTransaction(tx, itx) {
        var _this = _super.call(this) || this;
        _this.internal = true;
        // ^ "call" | ??
        _this.error = null;
        _this.transaction = tx;
        _this.callType = itx.action.callType;
        _this.from = itx.action.from;
        _this.to = itx.action.to;
        // @TODO(shrugs) - contractAddress for deploys?
        _this.input = itx.action.input;
        _this.from = itx.action.from;
        _this.gas = utils_1.toBN(itx.action.gas);
        _this.value = utils_1.toBN(itx.action.value);
        _this.blockHash = tx.blockHash;
        _this.blockNumber = tx.blockNumber;
        _this.subtraces = itx.subtraces;
        _this.traceAddress = itx.traceAddress;
        _this.transactionHash = tx.hash;
        // this.transactionPosition = tx.trans
        _this.type = itx.type;
        if (itx.error !== undefined) {
            _this.error = itx.error;
            return _this;
        }
        _this.result = __assign({}, itx.result, { gasUsed: utils_1.toBN(itx.result.gasUsed) });
        return _this;
        // invariant: itx.transactionHash === this.transaction.hash
    }
    return InternalTransaction;
}(Transaction_1["default"]));
exports["default"] = InternalTransaction;
