"use strict";
/**
 *
 * Run me with:
 * LATEST_BLOCK_HASH=0x79c943cb77f647e0553a101d0c1df2d05645782b3a1ac8d3cabc593eb4fc3fa3 \
 *   ts-node ./examples/kitty/index.ts
 */
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
var _this = this;
exports.__esModule = true;
var mobx_state_tree_1 = require("mobx-state-tree");
var Sequelize = require("sequelize");
var dist_1 = require("../../dist");
// NOTE: this needs to be a parity archive+tracing node
// personally, I have one of these in AWS and port-forward my local 8545 to that
var nodeEndpoint = 'http://localhost:8545';
// a local postgres database
var connectionString = 'postgres://postgres@localhost/default';
var sequelize = new Sequelize(connectionString);
var CRYPTO_KITTIES = '0x06012c8cf97BEaD5deAe237070F9587f8E7A266d';
dist_1.addABI(CRYPTO_KITTIES, [{
        anonymous: false,
        inputs: [
            { indexed: false, name: 'from', type: 'address' },
            { indexed: false, name: 'to', type: 'address' },
            { indexed: false, name: 'tokenId', type: 'uint256' },
        ],
        name: 'Transfer',
        type: 'event'
    }]);
var Counter = sequelize.define('counter', {
    id: { type: Sequelize.STRING, primaryKey: true },
    value: { type: Sequelize.INTEGER }
});
var Kitty = sequelize.define('kitty', {
    id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
    txId: { type: Sequelize.STRING },
    patchId: { type: Sequelize.STRING },
    kittyId: { type: Sequelize.STRING },
    owner: { type: Sequelize.STRING }
}, {
    indexes: [
        { fields: ['kittyId'] },
        { fields: ['owner'] },
        { fields: ['txId'] },
    ]
});
var MyTypeStore = {
    counterTracker: {
        counter: function (txId, patch) { return __awaiter(_this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _a = patch.op;
                        switch (_a) {
                            case 'add': return [3 /*break*/, 1];
                            case 'replace': return [3 /*break*/, 3];
                            case 'remove': return [3 /*break*/, 5];
                        }
                        return [3 /*break*/, 7];
                    case 1: return [4 /*yield*/, Counter.create({
                            id: patch.key,
                            value: patch.value
                        })];
                    case 2:
                        _b.sent();
                        return [3 /*break*/, 8];
                    case 3: return [4 /*yield*/, Counter.update({
                            id: patch.key,
                            value: patch.value
                        }, {
                            where: { id: patch.key }
                        })];
                    case 4:
                        _b.sent();
                        return [3 /*break*/, 8];
                    case 5: return [4 /*yield*/, Counter.destroy({
                            where: { id: patch.key }
                        })];
                    case 6:
                        _b.sent();
                        return [3 /*break*/, 8];
                    case 7:
                        {
                            throw new Error('wut');
                        }
                        _b.label = 8;
                    case 8: return [2 /*return*/];
                }
            });
        }); }
    },
    kittyTracker: {
        ownerOf: function (txId, patch) { return __awaiter(_this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _a = patch.op;
                        switch (_a) {
                            case 'add': return [3 /*break*/, 1];
                            case 'replace': return [3 /*break*/, 3];
                            case 'remove': return [3 /*break*/, 5];
                        }
                        return [3 /*break*/, 7];
                    case 1: return [4 /*yield*/, Kitty.create({
                            txId: txId,
                            patchId: patch.id,
                            kittyId: patch.key,
                            owner: patch.value
                        })];
                    case 2:
                        _b.sent();
                        return [3 /*break*/, 8];
                    case 3: return [4 /*yield*/, Kitty.update({
                            txId: txId,
                            patchId: patch.id,
                            kittyId: patch.key,
                            owner: patch.value
                        }, {
                            where: { kittyId: patch.key }
                        })];
                    case 4:
                        _b.sent();
                        return [3 /*break*/, 8];
                    case 5: return [4 /*yield*/, Kitty.destroy({
                            where: { kittyId: patch.key }
                        })];
                    case 6:
                        _b.sent();
                        return [3 /*break*/, 8];
                    case 7:
                        {
                            throw new Error('wut');
                        }
                        _b.label = 8;
                    case 8: return [2 /*return*/];
                }
            });
        }); }
    }
};
var reasons = {
    TransactionExists: 'TRANSACTION_EXISTS',
    KittyTransfer: 'KITTY_TRANSFER'
};
var CounterTracker = mobx_state_tree_1.types
    .model('CounterTracker', {
    counter: mobx_state_tree_1.types.optional(mobx_state_tree_1.types.map(mobx_state_tree_1.types.number), {})
})
    .actions(function (self) { return ({
    increment: function (key, amount) {
        if (amount === void 0) { amount = 1; }
        self.counter.set(key, self.counter.has(key)
            ? self.counter.get(key) + amount
            : amount);
    }
}); });
var KittyTracker = mobx_state_tree_1.types
    .model('KittyTracker', {
    ownerOf: mobx_state_tree_1.types.optional(mobx_state_tree_1.types.map(mobx_state_tree_1.types.string), {})
})
    .actions(function (self) { return ({
    setOwner: function (tokenId, to) {
        self.ownerOf.set(tokenId, to);
    }
}); });
var Store = mobx_state_tree_1.types.model('Store', {
    counterTracker: mobx_state_tree_1.types.optional(CounterTracker, {}),
    kittyTracker: mobx_state_tree_1.types.optional(KittyTracker, {})
});
var stateReference = Store.create({
    counterTracker: CounterTracker.create(),
    kittyTracker: KittyTracker.create()
});
var storeInterface = new SequelizePersistInterface(connectionString);
var onBlock = function (block) { return __awaiter(_this, void 0, void 0, function () {
    var _this = this;
    return __generator(this, function (_a) {
        console.log("[gnarly] processing block " + block.number + " (" + block.hash + ") with " + block.transactions.length + " txs");
        dist_1.because(reasons.TransactionExists, {}, function () {
            stateReference.counterTracker.increment('txs', block.transactions.length);
        });
        forEach(block.transactions, function (tx) { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!addressesEqual(tx.to, CRYPTO_KITTIES)) return [3 /*break*/, 2];
                        return [4 /*yield*/, tx.getReceipt()];
                    case 1:
                        _a.sent();
                        tx.logs.forEach(function (log) {
                            if (log.event === 'Transfer') {
                                var _a = log.args, to_1 = _a.to, tokenId_1 = _a.tokenId;
                                dist_1.because(reasons.KittyTransfer, {}, function () {
                                    stateReference.kittyTracker.setOwner(tokenId_1, to_1);
                                });
                            }
                        });
                        _a.label = 2;
                    case 2: return [2 /*return*/];
                }
            });
        }); });
        return [2 /*return*/];
    });
}); };
var gnarly = new dist_1["default"](stateReference, storeInterface, nodeEndpoint, MyTypeStore, onBlock);
var main = function () { return __awaiter(_this, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, storeInterface.setup()];
            case 1:
                _a.sent();
                return [4 /*yield*/, Counter.sync({ force: true })];
            case 2:
                _a.sent();
                return [4 /*yield*/, Kitty.sync({ force: true })];
            case 3:
                _a.sent();
                return [4 /*yield*/, gnarly.shaka()];
            case 4:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); };
process.on('unhandledRejection', function (error) {
    console.error(error);
    process.exit(1);
});
process.on('SIGINT', function () {
    gnarly.bailOut();
    process.exit(0);
});
main()["catch"](function (error) {
    console.error(error, error.stack);
    process.exit(1);
});
