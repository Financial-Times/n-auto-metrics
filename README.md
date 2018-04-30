# n-auto-metrics

[![npm version](https://badge.fury.io/js/%40financial-times%2Fn-auto-metrics.svg)](https://badge.fury.io/js/%40financial-times%2Fn-auto-metrics)
![npm download](https://img.shields.io/npm/dm/@financial-times/n-auto-metrics.svg)
![node version](https://img.shields.io/node/v/@financial-times/n-auto-metrics.svg)

[![CircleCI](https://circleci.com/gh/Financial-Times/n-auto-metrics.svg?style=shield)](https://circleci.com/gh/Financial-Times/n-auto-metrics)
[![Coverage Status](https://coveralls.io/repos/github/Financial-Times/n-auto-metrics/badge.svg?branch=master)](https://coveralls.io/github/Financial-Times/n-auto-metrics?branch=master) 
[![Known Vulnerabilities](https://snyk.io/test/github/Financial-Times/n-auto-metrics/badge.svg)](https://snyk.io/test/github/Financial-Times/n-auto-metrics)
[![Scrutinizer Code Quality](https://scrutinizer-ci.com/g/Financial-Times/n-auto-metrics/badges/quality-score.png?b=master)](https://scrutinizer-ci.com/g/Financial-Times/n-auto-metrics/?branch=master)
[![Dependencies](https://david-dm.org/Financial-Times/n-auto-metrics.svg)](https://david-dm.org/Financial-Times/n-auto-metrics)
[![devDependencies](https://david-dm.org/Financial-Times/n-auto-metrics/dev-status.svg)](https://david-dm.org/Financial-Times/n-auto-metrics?type=dev)

auto record metrics of function calls in operation/action model with a single line of code

<br>

- [quickstart](#quickstart)
- [install](#install)
- [usage](#usage)
   * [chain with other enhancers](#chain-with-other-enhancers)
   * [reserved fields](#reserved-fields)
   * [metrics format](#metrics-format)
- [example](#example)

<br>

## quickstart

initialise metrics before using enhanced middleware

```js
/* app.js */
import { metrics } from 'n-express'; // or any other source has the `next-metrics` instance
import { initAutoMetrics } from '@financial-times/n-auto-metrics';

initAutoMetrics(metrics); // do this before app.use() any enhanced middleware/controller
```

enhance action function to auto metrics

```js
import { metricsAction } from '@financial-times/n-auto-metrics';

// auto metrics function of its start, success/failure state
const result = metricsAction(someFunction)(args: Object, meta?: Object);

// auto metrics multiple functions wrapped in an object
// use addMeta to add `service` before `metricsAction` to record the enhanced function under one namespace
const APIService = compose(
  addMeta({ service: 'some-service' }),
  metricsAction
)({ 
  methodA, 
  methodB, 
  methodC 
});
```
> more details on [action function](https://github.com/financial-Times/n-express-enhancer#action-function)


```js
// auto log success/failure express middleware/controller as an operation function 
// function name would be logged as `operation`, and available in meta
const operationFunction = (meta, req, res) => { /* try-catch-throw */ };
export default toMiddleware(metricsOperation(operationFunction));

// auto log multiple operation functions wrapped in an object as controller
const someController = toMiddlewares(metricsOperation({ operationFunctionA, operationFuncitonB }));
```
> more details on [operation function](https://github.com/financial-Times/n-express-enhancer#operation-function)

## install
```shell
npm install @financial-times/n-auto-metrics
```

## usage

### chain with other enhancers

check [n-express-enhancer](https://github.com/Financial-Times/n-express-enhancer/blob/master/README.md#chain-a-series-of-enhancers)

### reserved fields

* `operation` default to `operationFunction.name`
* `service` default to `undefined`, can be specified in `paramsOrArgs` or `meta`(`autoLogActions('service-name')`)
* `action` default to `callFunction.name`
* `category` [NError](https://github.com/financial-times/n-error) category would be recorded in metrics
* `type` is used by convention to record custom error type names for monitoring and debugging
* `status` in error object would be recorded for service action call failure
* `stack` used in Error or NError to store the stack trace
* `result` default to `success/failure`

### metrics format

> `operation.${operation}.segment.${segment}.state.start`
> `operation.${operation}.action.${action}.state.start`
> `operation.${operation}.action.${action}.state.success`
> `operation.${operation}.action.${action}.state.failure.category.${e.category}.type.${e.type}`
> `operation.${operation}.action.${action}.state.failure.category.${e.category}.status.${e.status}`
> `operation.${operation}.segment.${segment}.state.success`
> `operation.${operation}.segment.${segment}.state.failure.category.${e.category}.type.${e.type}`
> `service.${service}.action.${action}.state.start`
> `service.${service}.action.${action}.state.success`
> `service.${service}.action.${action}.state.failure.category.${e.category}.type.${e.type}`
> `service.${service}.action.${action}.state.failure.category.${e.category}.status.${e.status}`


## example

[enhanced api service example](https://github.com/Financial-Times/newspaper-mma/blob/master/server/apis/newspaper-info-svc.js)

[enhanced controller example](https://github.com/Financial-Times/newspaper-mma/blob/master/server/routes/delivery-address/controller.js)
