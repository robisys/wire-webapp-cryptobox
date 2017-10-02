"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Cryptobox_1 = require("../Cryptobox");
var SerialisedRecord = (function () {
    function SerialisedRecord(serialised, id) {
        this.created = Date.now();
        this.id = id;
        this.serialised = serialised;
        this.version = Cryptobox_1.Cryptobox.prototype.VERSION;
    }
    return SerialisedRecord;
}());
exports.SerialisedRecord = SerialisedRecord;
