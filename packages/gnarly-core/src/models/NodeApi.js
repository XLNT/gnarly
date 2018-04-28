"use strict";
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
var NodeApi = /** @class */ (function () {
    function NodeApi(nodeEndpoint) {
        var _this = this;
        this.nodeEndpoint = nodeEndpoint;
        this.getBlockByNumber = function (num) { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                // console.log('[getBlockByNumber]', num.toString(10), `0x${num.toString(16)}`)
                return [2 /*return*/, this.doFetch('eth_getBlockByNumber', ["0x" + num.toString(16), true])];
            });
        }); };
        this.getBlockByHash = function (hash) { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                // console.log('[getBlockByHash]', hash)
                return [2 /*return*/, this.doFetch('eth_getBlockByHash', [hash, true])];
            });
        }); };
        this.getLogs = function (filterOptions) { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                // console.log('[getLogs]', filterOptions)
                return [2 /*return*/, this.doFetch('eth_getLogs', [filterOptions])];
            });
        }); };
        this.getLatestBlock = function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                // console.log('[getLatestBlock]')
                return [2 /*return*/, this.doFetch('eth_getBlockByNumber', ['latest', true])];
            });
        }); };
        this.getTransactionReciept = function (hash) { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.doFetch('eth_getTransactionReceipt', [hash])];
            });
        }); };
        this.traceTransaction = function (hash) { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.doFetch('trace_replayTransaction', [hash, ['trace']])];
                    case 1: return [2 /*return*/, (_a.sent()).trace];
                }
            });
        }); };
        this.doFetch = function (method, params) {
            if (params === void 0) { params = []; }
            return __awaiter(_this, void 0, void 0, function () {
                var res, data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, fetch(this.nodeEndpoint, {
                                method: 'POST',
                                headers: new Headers({ 'Content-Type': 'application/json' }),
                                body: JSON.stringify({
                                    jsonrpc: '2.0',
                                    id: 1,
                                    method: method,
                                    params: params
                                })
                            })];
                        case 1:
                            res = _a.sent();
                            return [4 /*yield*/, res.json()];
                        case 2:
                            data = _a.sent();
                            if (data.result === undefined || data.result === null) {
                                throw new Error("Invalid JSON response: " + JSON.stringify(data, null, 2));
                            }
                            return [2 /*return*/, data.result];
                    }
                });
            });
        };
    }
    return NodeApi;
}());
exports["default"] = NodeApi;
