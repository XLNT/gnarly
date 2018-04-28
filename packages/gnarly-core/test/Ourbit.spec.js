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
var _this = this;
exports.__esModule = true;
var chai = require("chai");
var spies = require("chai-spies");
var mobx_state_tree_1 = require("mobx-state-tree");
require("mocha");
var uuid = require("uuid");
var Ourbit_1 = require("../src/Ourbit");
var MockPersistInterface_1 = require("./helpers/MockPersistInterface");
var expect = chai.expect, use = chai.use;
use(spies);
var sandbox = chai.spy.sandbox();
// Helpers
var KittyTracker = mobx_state_tree_1.types
    .model('KittyTracker', {
    ownerOf: mobx_state_tree_1.types.optional(mobx_state_tree_1.types.map(mobx_state_tree_1.types.string), {})
})
    .actions(function (self) { return ({
    transfer: function (tokenId, to) {
        self.ownerOf.set(tokenId, to);
    }
}); });
var Store = mobx_state_tree_1.types.model('Store', {
    kittyTracker: mobx_state_tree_1.types.optional(KittyTracker, {})
});
describe('Ourbit', function () {
    var ourbit;
    var stateReference;
    var persistPatchSpy;
    var storeInterface = new MockPersistInterface_1["default"]();
    var testFn;
    beforeEach(function () {
        // tslint:disable-next-line
        chai.spy.on(uuid, 'v4', function () {
            return 'mockPatch';
        });
        stateReference = Store.create({
            kittyTracker: KittyTracker.create()
        });
        persistPatchSpy = chai.spy();
        testFn = function () {
            stateReference.kittyTracker.transfer('0x12345', '0x0987');
        };
        sandbox.on(storeInterface, ['getTransactions', 'deleteTransaction', 'saveTransaction', 'getTransaction']);
        ourbit = new Ourbit_1["default"](stateReference, storeInterface, persistPatchSpy);
    });
    afterEach(function () {
        sandbox.restore();
        // tslint:disable-next-line
        chai.spy.restore(uuid);
    });
    describe('- processTransaction()', function () {
        it('should call saveTransaction with appropriate info', function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                ourbit.processTransaction('mockTransaction', testFn);
                expect(storeInterface.saveTransaction).to.have.been.called["with"](MockPersistInterface_1.mockTransaction);
                return [2 /*return*/];
            });
        }); });
        it('should call persistPatch', function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, ourbit.processTransaction('mockTransaction', testFn)
                        // tslint:disable-next-line no-unused-expression
                    ];
                    case 1:
                        _a.sent();
                        // tslint:disable-next-line no-unused-expression
                        expect(persistPatchSpy).to.have.been.called.once;
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('- rollbackTransaction()', function () {
        it('should call deleteTransaction with appropriate info', function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, ourbit.rollbackTransaction('mockTransaction')];
                    case 1:
                        _a.sent();
                        expect(storeInterface.deleteTransaction).to.have.been.called["with"](MockPersistInterface_1.mockTransaction);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should emit `patch` events', function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, ourbit.processTransaction('mockTransaction', testFn)];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, ourbit.rollbackTransaction('mockTransaction')
                            // tslint:disable-next-line no-unused-expression
                        ];
                    case 2:
                        _a.sent();
                        // tslint:disable-next-line no-unused-expression
                        expect(persistPatchSpy).to.have.been.called.twice;
                        return [2 /*return*/];
                }
            });
        }); });
        it('should rollback stateReference to previous state', function () { return __awaiter(_this, void 0, void 0, function () {
            var ownerOf;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, ourbit.processTransaction('mockTransaction', testFn)];
                    case 1:
                        _a.sent();
                        ownerOf = stateReference.kittyTracker.ownerOf.get('0x12345');
                        expect(ownerOf).to.equal('0x0987');
                        return [4 /*yield*/, ourbit.rollbackTransaction('mockTransaction')];
                    case 2:
                        _a.sent();
                        ownerOf = stateReference.kittyTracker.ownerOf.get('0x12345');
                        expect(ownerOf).to.equal(undefined);
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('- resumeFromTxId()', function () {
        it('should call getTransactions with appropriate info', function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, ourbit.resumeFromTxId('mockTransaction')];
                    case 1:
                        _a.sent();
                        expect(storeInterface.getTransactions).to.have.been.called["with"]('mockTransaction');
                        return [2 /*return*/];
                }
            });
        }); });
        it('should  not emit `patch` events', function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, ourbit.resumeFromTxId('mockTransaction')
                        // tslint:disable-next-line no-unused-expression
                    ];
                    case 1:
                        _a.sent();
                        // tslint:disable-next-line no-unused-expression
                        expect(persistPatchSpy).to.not.have.been.called.once;
                        return [2 /*return*/];
                }
            });
        }); });
        it('should bring stateReference to current state', function () { return __awaiter(_this, void 0, void 0, function () {
            var ownerOf;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, ourbit.resumeFromTxId('mockTransaction')];
                    case 1:
                        _a.sent();
                        ownerOf = stateReference.kittyTracker.ownerOf.get('0x12345');
                        expect(ownerOf).to.equal('0x0987');
                        return [2 /*return*/];
                }
            });
        }); });
    });
});
