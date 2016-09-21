# Wire

This repository is part of the source code of Wire. You can find more information at [wire.com](https://wire.com) or by contacting opensource@wire.com.

You can find the published source code at [github.com/wireapp](https://github.com/wireapp).

For licensing information, see the attached LICENSE file and the list of third-party licenses at [wire.com/legal/licenses/](https://wire.com/legal/licenses/).

## Build Status

[![Build Status](https://travis-ci.org/wireapp/wire-webapp-cryptobox.svg?branch=master)](https://travis-ci.org/wireapp/wire-webapp-cryptobox)

## Minimal Working Example

```javascript
const cryptobox = require('wire-webapp-cryptobox');

var store = new cryptobox.store.Cache();
var box = new cryptobox.Cryptobox(store);

box.init()
.then(function (instance) {
  var fingerprint = instance.identity.public_key.fingerprint();
  console.log(`Hello, my public fingerprint is '${fingerprint}'.`);
});
```
