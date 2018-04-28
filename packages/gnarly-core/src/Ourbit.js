"use strict";
var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
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
var mobx_1 = require("mobx");
var mobx_state_tree_1 = require("mobx-state-tree");
var utils_1 = require("./utils");
var uuid = require("uuid");
var Ourbit = /** @class */ (function () {
    function Ourbit(targetState, store, persistPatch) {
        var _this = this;
        this.skipping = false;
        this.patches = [];
        this.inversePatches = [];
        /**
         * Tracks and perists patches (created by fn) by txId
         * @param txId transaction id
         * @param fn mutating function
         */
        this.processTransaction = function (txId, fn) { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mobx_1.transaction(function () {
                            fn();
                        });
                        return [4 /*yield*/, this.commitTransaction({
                                id: txId,
                                patches: this.patches,
                                inversePatches: this.inversePatches
                            })
                            // reset local state
                        ];
                    case 1:
                        _a.sent();
                        // reset local state
                        this.patches = [];
                        this.inversePatches = [];
                        return [2 /*return*/];
                }
            });
        }); };
        /**
         * Applys inverse patches from a specific transaction, mutating the target state
         * @TODO(shrugs) - make this a "fix-forward" operation and include event log
         * @param txId transaction id
         */
        this.rollbackTransaction = function (txId) { return __awaiter(_this, void 0, void 0, function () {
            var _this = this;
            var tx;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.store.getTransaction(txId)];
                    case 1:
                        tx = _a.sent();
                        this.untracked(function () {
                            mobx_state_tree_1.applyPatch(_this.targetState, tx.inversePatches);
                        });
                        return [4 /*yield*/, this.uncommitTransaction(tx)];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); };
        this.notifyPatches = function (txId, patches) { return __awaiter(_this, void 0, void 0, function () {
            var _i, patches_1, patch;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _i = 0, patches_1 = patches;
                        _a.label = 1;
                    case 1:
                        if (!(_i < patches_1.length)) return [3 /*break*/, 4];
                        patch = patches_1[_i];
                        return [4 /*yield*/, this.persistPatch(txId, patch)];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4: return [2 /*return*/];
                }
            });
        }); };
        this.commitTransaction = function (tx) { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.store.saveTransaction(tx)];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, this.notifyPatches(tx.id, tx.patches)];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); };
        this.uncommitTransaction = function (tx) { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.store.deleteTransaction(tx)];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, this.notifyPatches(tx.id, tx.inversePatches)];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); };
        this.untracked = function (fn) {
            _this.skipping = true;
            fn();
            _this.skipping = false;
        };
        this.handlePatch = function (patch, inversePatch) {
            if (_this.skipping) {
                return;
            }
            // we have access to reason and meta here, thanks to the global
            // so we need to log that in the database to track why patches were made
            // // do we need to replace the json blob with a linked array of
            // patches? how do we link the artifact with the event log?
            // console.log(globalState.currentReason)
            var patchId = uuid.v4();
            var pathParts = utils_1.splitPath(patch.path);
            // parse storeKey and keyKey from path and provide to patch
            _this.patches.push(__assign({}, patch, { id: patchId }, pathParts));
            _this.inversePatches.push(__assign({}, inversePatch, { id: patchId }, pathParts));
        };
        this.targetState = targetState;
        this.store = store;
        this.persistPatch = persistPatch;
        mobx_state_tree_1.onPatch(this.targetState, this.handlePatch);
    }
    /**
     * Replays all patches on the targetState from txId
     * @param txId transaction id
     */
    Ourbit.prototype.resumeFromTxId = function (txId) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            var allTxs;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.store.getTransactions(txId)
                        // @TODO(shrugs) - do we need to untrack this?
                    ];
                    case 1:
                        allTxs = _a.sent();
                        // @TODO(shrugs) - do we need to untrack this?
                        this.untracked(function () {
                            allTxs.forEach(function (tx, i) {
                                console.log('[applyPatch]', i, tx.id, tx.patches);
                                mobx_state_tree_1.applyPatch(_this.targetState, tx.patches);
                            });
                        });
                        return [2 /*return*/];
                }
            });
        });
    };
    return Ourbit;
}());
exports["default"] = Ourbit;
