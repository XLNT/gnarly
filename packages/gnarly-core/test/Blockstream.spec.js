"use strict";
exports.__esModule = true;
var chai = require("chai");
var spies = require("chai-spies");
var mobx_state_tree_1 = require("mobx-state-tree");
require("mocha");
var uuid = require("uuid");
var Blockstream_1 = require("../src/Blockstream");
var Ourbit_1 = require("../src/Ourbit");
var MockPersistInterface_1 = require("./helpers/MockPersistInterface");
chai.use(spies);
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
describe('Blockstream', function () {
    var blockstream;
    var ourbit;
    var onBlockSpy;
    var persistPatchSpy;
    var stateReference;
    var storeInterface = new MockPersistInterface_1["default"]();
    beforeEach(function () {
        // tslint:disable-next-line
        chai.spy.on(uuid, 'v4', function () {
            return 'mockPatch';
        });
        stateReference = Store.create({
            kittyTracker: KittyTracker.create()
        });
        onBlockSpy = chai.spy();
        persistPatchSpy = chai.spy();
        sandbox.on(storeInterface, ['getTransactions', 'deleteTransaction', 'saveTransaction', 'getTransaction']);
        ourbit = new Ourbit_1["default"](stateReference, storeInterface, persistPatchSpy);
        blockstream = new Blockstream_1["default"](ourbit, onBlockSpy);
    });
    afterEach(function () {
        sandbox.restore();
        // tslint:disable-next-line
        chai.spy.restore(uuid);
    });
    describe('- start()', function () {
    });
    describe('- stop()', function () {
    });
});
