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
var ethereumjs_blockstream_1 = require("ethereumjs-blockstream");
require("isomorphic-fetch");
var Queue = require("promise-queue");
var utils_1 = require("./utils");
var globalstate_1 = require("./globalstate");
var MAX_QUEUE_LENGTH = 100;
var BlockStream = /** @class */ (function () {
    // only 100 pending transactions at once or something, dial this in
    function BlockStream(ourbit, onBlock, interval) {
        if (interval === void 0) { interval = 5000; }
        var _this = this;
        this.ourbit = ourbit;
        this.onBlock = onBlock;
        this.interval = interval;
        /**
         * Whether or not the blockstreamer is syncing blocks from the past or not
         */
        this.syncing = false;
        this.pendingTransactions = new Queue(1, MAX_QUEUE_LENGTH);
        this.start = function (fromBlockHash) {
            if (fromBlockHash === void 0) { fromBlockHash = null; }
            return __awaiter(_this, void 0, void 0, function () {
                var startBlockNumber, startFromBlock, latestBlockNumber, _a, i, block, _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            this.streamer = new ethereumjs_blockstream_1.BlockAndLogStreamer(globalstate_1.globalState.api.getBlockByHash, globalstate_1.globalState.api.getLogs, {
                                blockRetention: 100
                            });
                            this.onBlockAddedSubscriptionToken = this.streamer.subscribeToOnBlockAdded(this.onBlockAdd);
                            this.onBlockRemovedSubscriptionToken = this.streamer.subscribeToOnBlockRemoved(this.onBlockInvalidated);
                            if (!(fromBlockHash === null)) return [3 /*break*/, 1];
                            // if no hash provided, we're starting from scratch
                            startBlockNumber = utils_1.toBN(0);
                            return [3 /*break*/, 3];
                        case 1: return [4 /*yield*/, globalstate_1.globalState.api.getBlockByHash(fromBlockHash)];
                        case 2:
                            startFromBlock = _c.sent();
                            startBlockNumber = utils_1.toBN(startFromBlock.number).add(utils_1.toBN(1));
                            _c.label = 3;
                        case 3:
                            _a = utils_1.toBN;
                            return [4 /*yield*/, globalstate_1.globalState.api.getLatestBlock()];
                        case 4:
                            latestBlockNumber = _a.apply(void 0, [(_c.sent()).number]);
                            if (!latestBlockNumber.gt(startBlockNumber)) return [3 /*break*/, 10];
                            console.log("[fast-forward] Starting from " + startBlockNumber.toNumber() + " to " + latestBlockNumber.toNumber());
                            this.syncing = true;
                            i = startBlockNumber.clone();
                            _c.label = 5;
                        case 5:
                            if (!i.lt(latestBlockNumber)) return [3 /*break*/, 9];
                            return [4 /*yield*/, globalstate_1.globalState.api.getBlockByNumber(i)];
                        case 6:
                            block = _c.sent();
                            console.log("[fast-forward] block " + block.number + " (" + block.hash + ")");
                            i = i.add(utils_1.toBN(1));
                            return [4 /*yield*/, this.streamer.reconcileNewBlock(block)
                                // TODO: easy optimization, only check latest block on the last
                                // iteration
                            ];
                        case 7:
                            _c.sent();
                            _b = utils_1.toBN;
                            return [4 /*yield*/, globalstate_1.globalState.api.getLatestBlock()];
                        case 8:
                            // TODO: easy optimization, only check latest block on the last
                            // iteration
                            latestBlockNumber = _b.apply(void 0, [(_c.sent()).number]);
                            return [3 /*break*/, 5];
                        case 9:
                            this.syncing = false;
                            _c.label = 10;
                        case 10:
                            this.beginTracking();
                            return [2 /*return*/];
                    }
                });
            });
        };
        this.stop = function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        clearInterval(this.reconciling);
                        this.streamer.unsubscribeFromOnBlockAdded(this.onBlockAddedSubscriptionToken);
                        this.streamer.unsubscribeFromOnBlockRemoved(this.onBlockRemovedSubscriptionToken);
                        return [4 /*yield*/, this.pendingTransactions.add(function () { return Promise.resolve(); })];
                    case 1:
                        _a.sent();
                        console.log('pending', this.pendingTransactions.getPendingLength());
                        return [2 /*return*/];
                }
            });
        }); };
        this.onBlockAdd = function (block) { return __awaiter(_this, void 0, void 0, function () {
            var _this = this;
            var pendingTransaction;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log("[onBlockAdd] " + block.number + " (" + block.hash + ")");
                        pendingTransaction = function () { return _this.ourbit.processTransaction(block.hash, _this.onBlock(block, _this.syncing)); };
                        _a.label = 1;
                    case 1:
                        if (!(this.pendingTransactions.getQueueLength() + 1 >= MAX_QUEUE_LENGTH)) return [3 /*break*/, 3];
                        console.log("[queue] Reached max queue size of " + MAX_QUEUE_LENGTH + ", waiting a bit...");
                        return [4 /*yield*/, utils_1.timeout(1000)];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 1];
                    case 3:
                        this.pendingTransactions.add(pendingTransaction);
                        return [2 /*return*/];
                }
            });
        }); };
        this.onBlockInvalidated = function (block) {
            console.log("[onBlockInvalidated] " + block.number + " (" + block.hash + ")");
            var pendingTransaction = function () { return _this.ourbit.rollbackTransaction(block.hash); };
            _this.pendingTransactions.add(pendingTransaction);
        };
        this.beginTracking = function () {
            // @TODO - replace this with a filter
            _this.reconciling = setInterval(function () { return __awaiter(_this, void 0, void 0, function () {
                var _a, _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            _b = (_a = this.streamer).reconcileNewBlock;
                            return [4 /*yield*/, globalstate_1.globalState.api.getLatestBlock()];
                        case 1: return [4 /*yield*/, _b.apply(_a, [_c.sent()])];
                        case 2:
                            _c.sent();
                            return [2 /*return*/];
                    }
                });
            }); }, _this.interval);
        };
    }
    return BlockStream;
}());
exports["default"] = BlockStream;
