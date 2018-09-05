# n-auto-metrics

a metrics [decorator](https://github.com/Financial-Times/n-express-enhancer) to automate function metrics in operation/action model to monitor system and upstream services as well as business metrics

> It has been consolidated into [n-express-monitor](https://github.com/financial-Times/n-express-monitor), please use that instead unless you're curious about things under the hood or want to customise your own tool chain

[![npm version](https://badge.fury.io/js/%40financial-times%2Fn-auto-metrics.svg)](https://badge.fury.io/js/%40financial-times%2Fn-auto-metrics)
![npm download](https://img.shields.io/npm/dm/@financial-times/n-auto-metrics.svg)
![node version](https://img.shields.io/node/v/@financial-times/n-auto-metrics.svg)

[![CircleCI](https://circleci.com/gh/Financial-Times/n-auto-metrics.svg?style=shield)](https://circleci.com/gh/Financial-Times/n-auto-metrics)
[![Coverage Status](https://coveralls.io/repos/github/Financial-Times/n-auto-metrics/badge.svg?branch=master)](https://coveralls.io/github/Financial-Times/n-auto-metrics?branch=master) 
[![Known Vulnerabilities](https://snyk.io/test/github/Financial-Times/n-auto-metrics/badge.svg)](https://snyk.io/test/github/Financial-Times/n-auto-metrics)
[![Scrutinizer Code Quality](https://scrutinizer-ci.com/g/Financial-Times/n-auto-metrics/badges/quality-score.png?b=master)](https://scrutinizer-ci.com/g/Financial-Times/n-auto-metrics/?branch=master)
[![Dependencies](https://david-dm.org/Financial-Times/n-auto-metrics.svg)](https://david-dm.org/Financial-Times/n-auto-metrics)
[![devDependencies](https://david-dm.org/Financial-Times/n-auto-metrics/dev-status.svg)](https://david-dm.org/Financial-Times/n-auto-metrics?type=dev)

<br>

- [Quickstart](#quickstart)
- [Install](#install)
- [Gotcha](#gotcha)
  * [reserved fields](#reserved-fields)
  * [metrics format](#metrics-format)
- [Licence](#licence)

<br>

## Install
```shell
npm i @financial-times/n-auto-metrics --save
```

## Usage

### setup

```js
/* app.js */
import { metrics } from 'n-express'; // or any other source has the `next-metrics` instance
import { initAutoMetrics } from '@financial-times/n-auto-metrics';

initAutoMetrics(metrics); // do this before app.use() any enhanced middleware/controller
```

### decorate functions

A top level execution is categorised as an Operation, this can be an express middleware or controller function. Any lower level execution is categorised as an Action, and a two-level model of operation-action is encouraged.

With different log level settings, it would log the start, success/failure `status` of the function execution, function names to `scope` the operation/action, description of the `error` and params you need to `recreate` the error.

```js
import { compose, autoNext, metricsOperation } from '@financial-times/n-auto-metrics';

const operation = (req, res) => {
  //let the error to be thrown
};

export default compose(
  autoNext,
  metricsOperation,
)(operation);
```

```js
import { metricsAction } from '@financial-times/n-auto-metrics';

const action = (params: Object, meta: Object) => {}; // the function signature needs to follow the convention

export default metricsAction(action);
```
```js
const operation = ({ meta }, res, next) => {
  action(param, meta); // pass the meta object from req.meta to thread operation/action
  //...
};
```

> [want even less lines of code?](https://github.com/Financial-Times/n-express-enhancer#enhance-a-set-of-functions)

## Gotcha

### the Metrics

for business metrics:
> `operation.${operation}.segment.${segment}.state.start`
> `operation.${operation}.segment.${segment}.state.success`
> `operation.${operation}.segment.${segment}.state.failure.category.${e.category}.type.${e.type}`

for system reliability:
> `operation.${operation}.action.${action}.state.start`
> `operation.${operation}.action.${action}.state.success`
> `operation.${operation}.action.${action}.state.failure.category.${e.category}.type.${e.type}`
> `operation.${operation}.action.${action}.state.failure.category.${e.category}.status.${e.status}`

for upstream service reliability:
> `service.${service}.action.${action}.state.start`
> `service.${service}.action.${action}.state.success`
> `service.${service}.action.${action}.state.failure.category.${e.category}.type.${e.type}`
> `service.${service}.action.${action}.state.failure.category.${e.category}.status.${e.status}`

### the Meta

check the common meta used by [n-auto-logger](https://github.com/Financial-Times/n-auto-logger/blob/master/README.md#the-meta)

`meta.segment` would be picked up in the metrics to help measure business metrics with user segment breakdown.

## Licence
[MIT](/LICENSE)
