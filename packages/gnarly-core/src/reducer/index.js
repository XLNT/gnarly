"use strict";
var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
exports.__esModule = true;
var mobx_state_tree_1 = require("mobx-state-tree");
var ReducerType;
(function (ReducerType) {
    /**
     * Idempotent reducers don't care about _when_ they are called.
     * While the original state may vary with time, the function of (state) => nextState does _not_.
     *
     * This reducer type is only called once per-block when the blockstream is fully synced
     * (because executing it before then is a waste).
     *
     * This is most useful for simple getters/computed values from smart contract state
     *  (like querying a specific user's token balance(s)).
     */
    ReducerType["Idempotent"] = "IDEMPOTENT";
    /**
     * TimeVarying reducers care about the time at which they are called. The original state
     * may vary with time, and that information cannot be lost.
     *
     * This reducer is called once per-block for every block gnarly ingests.
     *
     * This is most useful for things where the history of state is derived
     *  (like transaction history or art provenance).
     */
    ReducerType["TimeVarying"] = "TIME_VARYING";
    /**
     * Atomic reducers do not use time-sensitive values in their derivations, but require state
     * produced during every block. This means they can be run in parallel.
     *
     * NOTE: currently an Atomic reducer is === TimeVarying, but may be optimized to run in parallel
     *   in the future.
     *
     * This type of reducer is called once per-block and produces an atomic operation.
     *
     * This is most useful for traditional maps and reductions of state ala MapReduce
     *  (like keeping track of total transaction count).
     */
    ReducerType["Atomic"] = "ATOMIC";
})(ReducerType = exports.ReducerType || (exports.ReducerType = {}));
/**
 * Using the type information from the reducers array, build a root store
 * and a stateReference to that root store.
 */
exports.makeStateReference = function (reducers) {
    var storeTyping = reducers.reduce(function (memo, r) {
        return (__assign({}, memo, (_a = {}, _a[r.config.key] = mobx_state_tree_1.types.optional(r.stateType, {}), _a)));
        var _a;
    }, {});
    var Store = mobx_state_tree_1.types.model('Store', storeTyping);
    var storeValues = reducers.reduce(function (memo, r) {
        return (__assign({}, memo, (_a = {}, _a[r.config.key] = r.stateType.create(), _a)));
        var _a;
    }, {});
    return Store.create(storeValues);
};
