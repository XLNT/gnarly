"use strict";
exports.__esModule = true;
var globalstate_1 = require("../globalstate");
var utils_1 = require("../utils");
var Transaction = /** @class */ (function () {
    function Transaction() {
        var _this = this;
        // 0x12345678
        this.args = {};
        this.parse = function () {
            if (!_this.input) {
                return;
            }
            if (_this.input.length < 10) {
                return;
            }
            // ^ has data, but not enough for a method call
            // parse out method id
            var methodId = utils_1.getMethodId(_this.input);
            // look up abi in global state
            var methodAbi = globalstate_1.globalState.getMethod(_this.to, methodId);
            if (!methodAbi) {
                return;
            }
            // we have a method abi, so parse it out
            _this.method = methodAbi.name;
            _this.methodName = methodAbi.fullName;
            _this.signature = methodAbi.signature;
            _this.methodId = methodAbi.shortId;
            // @TODO(shrugs) - do that
            _this.args = {};
        };
    }
    return Transaction;
}());
exports["default"] = Transaction;
