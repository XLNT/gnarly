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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var InternalTransaction_1 = require("./InternalTransaction");
var Log_1 = require("./Log");
var Transaction_1 = require("./Transaction");
var globalstate_1 = require("../globalstate");
var utils_1 = require("../utils");
function isJSONExternalTransaction(obj) {
    return 'nonce' in obj;
}
function isJSONExternalTransactionReceipt(obj) {
    return 'status' in obj;
}
exports.isExternalTransaction = function (obj) { return 'external' in obj; };
var ExternalTransaction = /** @class */ (function (_super) {
    __extends(ExternalTransaction, _super);
    function ExternalTransaction(block, tx) {
        var _this = _super.call(this) || this;
        _this.external = true;
        _this.getReceipt = function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.setReceipt()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); };
        _this.getInternalTransactions = function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.setInternalTransactions()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); };
        _this.setReceipt = function () { return __awaiter(_this, void 0, void 0, function () {
            var txReceipt;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, globalstate_1.globalState.api.getTransactionReciept(this.hash)
                        // console.log('[setReceipt]', txReceipt)
                    ];
                    case 1:
                        txReceipt = _a.sent();
                        // console.log('[setReceipt]', txReceipt)
                        this.setSelf(txReceipt);
                        return [2 /*return*/];
                }
            });
        }); };
        _this.setInternalTransactions = function () { return __awaiter(_this, void 0, void 0, function () {
            var _this = this;
            var traces, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, globalstate_1.globalState.api.traceTransaction(this.hash)
                            // console.log('[setInternalTransactions]', traces)
                        ];
                    case 1:
                        traces = _a.sent();
                        // console.log('[setInternalTransactions]', traces)
                        this.internalTransactions = traces.map(function (itx) { return new InternalTransaction_1["default"](_this, itx); });
                        return [3 /*break*/, 3];
                    case 2:
                        error_1 = _a.sent();
                        console.error('[setInternalTransactions] trace_replayTransaction not working, ignoring', error_1, traces);
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        }); };
        _this.setSelf = function (tx) {
            if (isJSONExternalTransaction(tx)) {
                _this.nonce = utils_1.toBN(tx.nonce);
                _this.hash = tx.hash;
                _this.index = utils_1.toBN(tx.transactionIndex);
                _this.blockNumber = utils_1.toBN(tx.blockNumber);
                _this.blockHash = tx.blockHash;
                _this.from = tx.from;
                _this.to = tx.to;
                _this.value = utils_1.toBN(tx.value);
                _this.gasPrice = utils_1.toBN(tx.gasPrice);
                _this.gas = utils_1.toBN(tx.gas);
                _this.input = tx.input;
            }
            else if (isJSONExternalTransactionReceipt(tx)) {
                _this.cumulativeGasUsed = utils_1.toBN(tx.cumulativeGasUsed);
                _this.gasUsed = utils_1.toBN(tx.gasUsed);
                _this.contractAddress = tx.contractAddress;
                _this.logs = tx.logs.map(function (l) { return new Log_1["default"](_this, l); });
                _this.status = utils_1.toBN(tx.status);
            }
            else {
                throw new Error("Unexpected type " + tx + " in Transaction#setSelf()");
            }
        };
        _this.block = block;
        _this.setSelf(tx);
        return _this;
    }
    return ExternalTransaction;
}(Transaction_1["default"]));
exports["default"] = ExternalTransaction;
