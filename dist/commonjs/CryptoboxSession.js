"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Proteus = require("wire-webapp-proteus");
var DecryptionError_1 = require("./DecryptionError");
var CryptoboxSession = (function () {
    function CryptoboxSession(id, pk_store, session) {
        this.id = id;
        this.pk_store = pk_store;
        this.session = session;
        Object.freeze(this);
    }
    CryptoboxSession.prototype.decrypt = function (ciphertext) {
        if (ciphertext.byteLength === 0) {
            return Promise.reject(new DecryptionError_1.DecryptionError('Cannot decrypt an empty ArrayBuffer.'));
        }
        var envelope = Proteus.message.Envelope.deserialise(ciphertext);
        return this.session.decrypt(this.pk_store, envelope);
    };
    CryptoboxSession.prototype.encrypt = function (plaintext) {
        return this.session.encrypt(plaintext)
            .then(function (ciphertext) {
            return ciphertext.serialise();
        });
    };
    CryptoboxSession.prototype.fingerprint_local = function () {
        return this.session.local_identity.public_key.fingerprint();
    };
    CryptoboxSession.prototype.fingerprint_remote = function () {
        return this.session.remote_identity.fingerprint();
    };
    return CryptoboxSession;
}());
exports.CryptoboxSession = CryptoboxSession;
