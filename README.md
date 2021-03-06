# Wire

This repository is part of the source code of Wire. You can find more information at [wire.com](https://wire.com) or by contacting opensource@wire.com.

You can find the published source code at [github.com/wireapp](https://github.com/wireapp).

For licensing information, see the attached LICENSE file and the list of third-party licenses at [wire.com/legal/licenses/](https://wire.com/legal/licenses/).

## Cryptobox

Cryptobox provides a high-level API with persistent storage for the [Proteus][2] implementation of the [Axolotl][3] protocol.

[2]: https://github.com/wireapp/proteus
[3]: https://github.com/trevp/axolotl/wiki

## Build Status

[![Build Status](https://travis-ci.org/wireapp/wire-webapp-cryptobox.svg?branch=master)](https://travis-ci.org/wireapp/wire-webapp-cryptobox)

### robisys
[![Build Status](https://travis-ci.org/robisys/wire-webapp-cryptobox.svg?branch=master)](https://travis-ci.org/robisys/wire-webapp-cryptobox)

## Installation

### Browser

```bash
bower install wire-webapp-cryptobox
```

### Node.js

```bash
yarn add wire-webapp-cryptobox
```

## Usage

### Browser

- [index.html](./dist/index.html)

### Node.js

- [index.js](./dist/index.js) 

## Development

### Testing

Run individual test:

```bash
# Example
gulp test_browser --file "common/CacheSpec.js"
```

Run all tests (in Chrome & Node.js):

```bash
yarn test
```
