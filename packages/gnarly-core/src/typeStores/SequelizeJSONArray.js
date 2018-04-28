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
var JSONArrayTypeStore = function (model, // Sequelize
    keyValueKeys) {
    if (keyValueKeys === void 0) { keyValueKeys = { key: 'key', value: 'value' }; }
    return function (txId, patch) { return __awaiter(_this, void 0, void 0, function () {
        var index, _a, _b, existing, newValue, existing, newValue, existing, newValue, _c, _d, _e, _f;
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0:
                    index = patch.extra.length
                        ? parseInt(patch.extra[0], 10)
                        : 0;
                    _a = patch.op;
                    switch (_a) {
                        case 'add': return [3 /*break*/, 1];
                        case 'replace': return [3 /*break*/, 8];
                        case 'remove': return [3 /*break*/, 11];
                    }
                    return [3 /*break*/, 14];
                case 1:
                    _b = typeof patch.value;
                    switch (_b) {
                        case 'string': return [3 /*break*/, 2];
                    }
                    return [3 /*break*/, 5];
                case 2: return [4 /*yield*/, model.findOne({
                        where: (_c = {}, _c[keyValueKeys.key] = patch.key, _c)
                    })];
                case 3:
                    existing = _g.sent();
                    newValue = existing.get(keyValueKeys.value);
                    newValue.push(patch.value);
                    existing.set(keyValueKeys.value, newValue);
                    return [4 /*yield*/, existing.save()];
                case 4:
                    _g.sent();
                    return [3 /*break*/, 7];
                case 5: 
                // else it's an array, which means new thing
                return [4 /*yield*/, model.create((_d = {
                            txId: txId,
                            patchId: patch.id
                        },
                        _d[keyValueKeys.key] = patch.key,
                        _d[keyValueKeys.value] = patch.value,
                        _d))];
                case 6:
                    // else it's an array, which means new thing
                    _g.sent();
                    _g.label = 7;
                case 7: return [3 /*break*/, 15];
                case 8: return [4 /*yield*/, model.findOne({
                        where: (_e = {}, _e[keyValueKeys.key] = patch.key, _e)
                    })];
                case 9:
                    existing = _g.sent();
                    existing.set('patchId', patch.id);
                    newValue = existing.get(keyValueKeys.value);
                    newValue[index] = patch.value;
                    existing.set(keyValueKeys.value, newValue);
                    return [4 /*yield*/, existing.save()];
                case 10:
                    _g.sent();
                    return [3 /*break*/, 15];
                case 11: return [4 /*yield*/, model.findOne({
                        where: (_f = {}, _f[keyValueKeys.key] = patch.key, _f)
                    })];
                case 12:
                    existing = _g.sent();
                    existing.set('patchId', patch.id);
                    newValue = existing.get(keyValueKeys.value);
                    newValue.splice(index, 1);
                    existing.set(keyValueKeys.value, newValue);
                    return [4 /*yield*/, existing.save()];
                case 13:
                    _g.sent();
                    return [3 /*break*/, 15];
                case 14:
                    {
                        throw new Error('wut');
                    }
                    _g.label = 15;
                case 15: return [2 /*return*/];
            }
        });
    }); };
};
exports["default"] = JSONArrayTypeStore;
