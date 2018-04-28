"use strict";
exports.__esModule = true;
var abi = require("web3-eth-abi");
var globalstate_1 = require("../globalstate");
var utils_1 = require("../utils");
var Log = /** @class */ (function () {
    function Log(tx, log) {
        var _this = this;
        this.parse = function () {
            var registeredAbi = globalstate_1.globalState.getABI(_this.address);
            if (!registeredAbi) {
                return;
            }
            // ^ we do not know about this contract, so we can't try to parse it
            if (_this.topics.length === 0) {
                return;
            }
            // ^ there are no topics, which means this is an anonymous event or something
            // the first argument in topics (from solidity) is always the event signature
            var eventSig = _this.topics[0];
            // find the inputs by signature
            var logAbiItem = registeredAbi.find(function (item) { return item.signature === eventSig; });
            if (logAbiItem === undefined) {
                // ^ we don't have an input that matches this event (incomplete ABI?)
                return;
            }
            var args = abi.decodeLog(logAbiItem.inputs, _this.data, _this.topics.slice(1));
            _this.event = logAbiItem.name;
            _this.eventName = logAbiItem.fullName;
            _this.signature = logAbiItem.signature;
            _this.args = args;
        };
        this.transaction = tx;
        this.logIndex = utils_1.toBN(log.logIndex);
        this.blockNumber = utils_1.toBN(log.blockNumber);
        this.blockHash = log.blockHash;
        this.transactionHash = log.transactionHash;
        this.transactionIndex = utils_1.toBN(log.transactionIndex);
        this.address = log.address;
        this.data = log.data;
        this.topics = log.topics;
    }
    return Log;
}());
exports["default"] = Log;
