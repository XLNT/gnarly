"use strict";
exports.__esModule = true;
var chai_1 = require("chai");
require("mocha");
var utils_1 = require("../src/utils");
describe('Utils', function () {
    var reducerKey = 'kittyTracker';
    var domainKey = 'ownerOf';
    var key = '0x123';
    var testString = "/" + reducerKey + "/" + domainKey + "/" + key;
    describe('- splitPath', function () {
        it('should return an object with three keys', function () {
            var returnSplit = utils_1.splitPath(testString);
            chai_1.expect(returnSplit).to.be.an('Object');
            chai_1.expect(Object.keys(returnSplit)).to.have.lengthOf(3);
        });
        it('should return reducerKey, domainKey, and key with correct values', function () {
            var returnSplit = utils_1.splitPath(testString);
            chai_1.expect(returnSplit.reducerKey).to.equal(reducerKey);
            chai_1.expect(returnSplit.domainKey).to.equal(domainKey);
            chai_1.expect(returnSplit.key).to.equal(key);
        });
    });
});
