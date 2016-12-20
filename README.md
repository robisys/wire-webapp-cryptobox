# Wire

This repository is part of the source code of Wire. You can find more information at [wire.com](https://wire.com) or by contacting opensource@wire.com.

You can find the published source code at [github.com/wireapp](https://github.com/wireapp).

For licensing information, see the attached LICENSE file and the list of third-party licenses at [wire.com/legal/licenses/](https://wire.com/legal/licenses/).

## Build Status

[![Build Status](https://travis-ci.org/wireapp/wire-webapp-cryptobox.svg?branch=master)](https://travis-ci.org/wireapp/wire-webapp-cryptobox)

## Instructions

Run individual test:

```bash
gulp test_browser --file compliance/IntegrationSpec.js
gulp test_node --file compliance/IntegrationSpec.js
```

Run all tests (in Chrome & Node.js):

```bash
npm test
```

### Installation

**Browser**

```bash
bower install wire-webapp-cryptobox
```

**Node.js**

```bash
npm install wire-webapp-cryptobox
```

### Usage

**Browser**

- [index.html](./dist/index.html)

**Node.js**

- [index.js](./dist/index.js) 
