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
var sequelize_1 = require("sequelize");
var toInterface = function (model) { return ({
    id: model.get('id'),
    patches: model.get('patches'),
    inversePatches: model.get('inversePatches')
}); };
var SequelizePersistInterface = /** @class */ (function () {
    function SequelizePersistInterface(connectionString) {
        var _this = this;
        this.setup = function (reset) {
            if (reset === void 0) { reset = false; }
            return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.Transaction.sync({ force: reset })];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        this.getLatestTransaction = function () { return __awaiter(_this, void 0, void 0, function () {
            var tx;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.Transaction.findOne({ order: [['createdAt', 'DESC']] })];
                    case 1:
                        tx = _a.sent();
                        return [2 /*return*/, toInterface(tx)];
                }
            });
        }); };
        // @TODO(shrugs) - should this be fromTxId or toTxId?
        this.getTransactions = function (fromTxId) { return __awaiter(_this, void 0, void 0, function () {
            var txs;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.Transaction.findAll({
                            order: [['createdAt', 'ASC']]
                        })];
                    case 1:
                        txs = _a.sent();
                        return [2 /*return*/, txs.map(toInterface)];
                }
            });
        }); };
        this.deleteTransaction = function (tx) { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.Transaction.destroy({
                        where: { id: tx.id }
                    })];
            });
        }); };
        this.saveTransaction = function (tx) { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.Transaction.create(tx)];
            });
        }); };
        this.getTransaction = function (txId) { return __awaiter(_this, void 0, void 0, function () {
            var tx;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.Transaction.findById(txId)];
                    case 1:
                        tx = _a.sent();
                        return [2 /*return*/, toInterface(tx)];
                }
            });
        }); };
        this.connectionString = connectionString;
        this.sequelize = new sequelize_1["default"](this.connectionString, {
            logging: false,
            pool: {
                max: 5,
                min: 0,
                idle: 20000,
                acquire: 20000
            }
        });
        this.Transaction = this.sequelize.define('transaction', {
            id: {
                type: sequelize_1["default"].STRING,
                primaryKey: true
            },
            patches: sequelize_1["default"].JSONB,
            inversePatches: sequelize_1["default"].JSONB
        });
    }
    return SequelizePersistInterface;
}());
exports["default"] = SequelizePersistInterface;
