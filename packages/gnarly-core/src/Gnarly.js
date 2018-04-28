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
var Blockstream_1 = require("./Blockstream");
var Ourbit_1 = require("./Ourbit");
var Block_1 = require("./models/Block");
var NodeApi_1 = require("./models/NodeApi");
var reducer_1 = require("./reducer");
var globalstate_1 = require("./globalstate");
var Gnarly = /** @class */ (function () {
    function Gnarly(stateReference, storeInterface, nodeEndpoint, typeStore, reducers) {
        var _this = this;
        this.stateReference = stateReference;
        this.storeInterface = storeInterface;
        this.nodeEndpoint = nodeEndpoint;
        this.typeStore = typeStore;
        this.reducers = reducers;
        this.shouldResume = true;
        this.shaka = function () { return __awaiter(_this, void 0, void 0, function () {
            var latestBlockHash, latestTransaction;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(!this.shouldResume && process.env.LATEST_BLOCK_HASH)) return [3 /*break*/, 1];
                        latestBlockHash = process.env.LATEST_BLOCK_HASH;
                        return [3 /*break*/, 4];
                    case 1: return [4 /*yield*/, this.storeInterface.getLatestTransaction()];
                    case 2:
                        latestTransaction = _a.sent();
                        latestBlockHash = latestTransaction ? latestTransaction.id : null;
                        // ^ latest transaction id happens to also be the latest block hash
                        // so update this line if that ever becomes not-true
                        // let's re-hydrate local state by replaying transactions
                        return [4 /*yield*/, this.ourbit.resumeFromTxId(latestTransaction.id)];
                    case 3:
                        // ^ latest transaction id happens to also be the latest block hash
                        // so update this line if that ever becomes not-true
                        // let's re-hydrate local state by replaying transactions
                        _a.sent();
                        _a.label = 4;
                    case 4: return [4 /*yield*/, this.blockstreamer.start(latestBlockHash)];
                    case 5:
                        _a.sent();
                        return [2 /*return*/, this.bailOut.bind(this)];
                }
            });
        }); };
        this.bailOut = function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.blockstreamer.stop()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); };
        this.reset = function (shouldReset) {
            if (shouldReset === void 0) { shouldReset = true; }
            return __awaiter(_this, void 0, void 0, function () {
                var _i, _a, key, setup_1;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            this.shouldResume = !shouldReset;
                            this.storeInterface.setup(shouldReset);
                            _i = 0, _a = Object.keys(this.typeStore);
                            _b.label = 1;
                        case 1:
                            if (!(_i < _a.length)) return [3 /*break*/, 4];
                            key = _a[_i];
                            setup_1 = this.typeStore[key].__setup;
                            return [4 /*yield*/, setup_1(shouldReset)];
                        case 2:
                            _b.sent();
                            _b.label = 3;
                        case 3:
                            _i++;
                            return [3 /*break*/, 1];
                        case 4: return [2 /*return*/];
                    }
                });
            });
        };
        this.handleNewBlock = function (rawBlock, syncing) { return function () { return __awaiter(_this, void 0, void 0, function () {
            var block, _i, _a, reducer, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, this.normalizeBlock(rawBlock)];
                    case 1:
                        block = _c.sent();
                        _i = 0, _a = this.reducers;
                        _c.label = 2;
                    case 2:
                        if (!(_i < _a.length)) return [3 /*break*/, 10];
                        reducer = _a[_i];
                        _b = reducer.config.type;
                        switch (_b) {
                            case reducer_1.ReducerType.Idempotent: return [3 /*break*/, 3];
                            case reducer_1.ReducerType.TimeVarying: return [3 /*break*/, 6];
                            case reducer_1.ReducerType.Atomic: return [3 /*break*/, 6];
                        }
                        return [3 /*break*/, 8];
                    case 3:
                        if (!!syncing) return [3 /*break*/, 5];
                        // only call Idempotent reducers if not syncing
                        return [4 /*yield*/, reducer.reduce(this.stateReference[reducer.config.key], block)];
                    case 4:
                        // only call Idempotent reducers if not syncing
                        _c.sent();
                        _c.label = 5;
                    case 5: return [3 /*break*/, 9];
                    case 6: return [4 /*yield*/, reducer.reduce(this.stateReference[reducer.config.key], block)];
                    case 7:
                        _c.sent();
                        return [3 /*break*/, 9];
                    case 8: throw new Error("Unexpected ReducerType " + reducer.config.type);
                    case 9:
                        _i++;
                        return [3 /*break*/, 2];
                    case 10: return [2 /*return*/];
                }
            });
        }); }; };
        this.normalizeBlock = function (block) { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, new Block_1["default"](block)];
            });
        }); };
        this.persistPatchHandler = function (txId, patch) { return __awaiter(_this, void 0, void 0, function () {
            var storer;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        storer = this.typeStore[patch.reducerKey][patch.domainKey];
                        return [4 /*yield*/, storer(txId, patch)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); };
        globalstate_1.globalState.setApi(new NodeApi_1["default"](nodeEndpoint));
        this.ourbit = new Ourbit_1["default"](this.stateReference, this.storeInterface, this.persistPatchHandler);
        this.blockstreamer = new Blockstream_1["default"](this.ourbit, this.handleNewBlock);
    }
    return Gnarly;
}());
exports["default"] = Gnarly;
