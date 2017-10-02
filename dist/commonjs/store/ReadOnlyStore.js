"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var Proteus = require("wire-webapp-proteus");
var ReadOnlyStore = (function (_super) {
    __extends(ReadOnlyStore, _super);
    function ReadOnlyStore(store) {
        var _this = _super.call(this) || this;
        _this.store = store;
        _this.prekeys = [];
        return _this;
    }
    ReadOnlyStore.prototype.release_prekeys = function (deletedPreKeyIds) {
        var _this = this;
        deletedPreKeyIds.forEach(function (id) {
            var index = _this.prekeys.indexOf(id);
            if (index > -1) {
                _this.prekeys.splice(index, 1);
            }
        });
    };
    ReadOnlyStore.prototype.get_prekey = function (prekey_id) {
        if (this.prekeys.indexOf(prekey_id) !== -1) {
            return Promise.reject(new Error("PreKey \"" + prekey_id + "\" not found."));
        }
        return this.store.load_prekey(prekey_id)
            .then(function (prekey) {
            return prekey;
        });
    };
    ReadOnlyStore.prototype.remove = function (prekey_id) {
        this.prekeys.push(prekey_id);
        return Promise.resolve(prekey_id);
    };
    return ReadOnlyStore;
}(Proteus.session.PreKeyStore));
exports.ReadOnlyStore = ReadOnlyStore;
