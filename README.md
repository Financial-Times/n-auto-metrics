# n-auto-metrics

[![npm version](https://badge.fury.io/js/%40financial-times%2Fn-auto-metrics.svg)](https://badge.fury.io/js/%40financial-times%2Fn-auto-metrics) [![CircleCI](https://circleci.com/gh/Financial-Times/n-auto-metrics.svg?style=shield)](https://circleci.com/gh/Financial-Times/n-auto-metrics) [![Coverage Status](https://coveralls.io/repos/github/Financial-Times/n-auto-metrics/badge.svg?branch=master)](https://coveralls.io/github/Financial-Times/n-auto-metrics?branch=master) 
[![Known Vulnerabilities](https://snyk.io/test/github/Financial-Times/n-auto-metrics/badge.svg)](https://snyk.io/test/github/Financial-Times/n-auto-metrics) [![Dependencies](https://david-dm.org/Financial-Times/n-auto-metrics.svg)](https://david-dm.org/Financial-Times/n-auto-metrics) [![devDependencies](https://david-dm.org/Financial-Times/n-auto-metrics/dev-status.svg)](https://david-dm.org/Financial-Times/n-auto-metrics?type=dev)

auto record metrics of function calls in operation/action model with a single line of code

<br>

- [quickstart](#quickstart)
- [install](#install)
- [usage](#usage)
   * [action function signature](#action-function-signature)
   * [operation function format](#operation-function-format)
   * [use with other enhancers](#use-with-other-enhancers)
   * [reserved fields](#reserved-fields)
   * [metrics format](#metrics-format)
- [example](#example)
- [development](#development)

<br>

## quickstart
```js
import { 
  initAutoMetrics,
  autoMetricsAction, 
  autoMetricsActions, 
  autoMetricsOp,
  autoMetricsOps,
  toMiddleware,
  toMiddlewares,
} from '@financial-times/n-auto-metrics';
```

```js
/* app.js */
import { metrics } from 'n-express'; // or any other source has the `next-metrics` instance

initAutoMetrics(metrics); // do this before app.use() any enhanced middleware/controller
```

```js
// auto metrics function of its start, success/failure state
const result = autoMetricsAction(someFunction)(args: Object, meta?: Object);

// auto metrics multiple functions wrapped in an object
// `service` would need to be specified as the group namespace, passed to meta
const APIService = autoMetricsActions('api-service-name')({ methodA, methodB, methodC });
```
> more details on [action function signature](#action-function-signature)


```js
// auto log success/failure express middleware/controller as an operation function 
// function name would be logged as `operation`, and available in meta
const operationFunction = (meta, req, res, next) => {
  try {
    next();
  } catch(e) {
    next(e);
    throw e; // remember to throw in catch block so that failure can be logged correctly
  }
};
export default toMiddleware(autoMetricsOp(operationFunction));

// auto log multiple operation functions wrapped in an object as controller
const someController = toMiddlewares(autoMetricsOps({ operationFunctionA, operationFuncitonB }));
```
> more details on [operation function error handling](#operation-function-error-handling)

```js
// auto metrics operation and action together
const operationFunction = async (meta, req, res, next) => {
  try {
    const data = await APIService.methodA(params, meta); // from autoMetricsActions
    next();
  } catch(e) {
    next(e);
    throw e;
  }
};

export default toMiddleware(autoMetricsOp(operationFunction));
```

## install
```shell
npm install @financial-times/n-auto-metrics
```

## usage

### action function signature

`n-auto-metrics` allows two objects as the args of the autoMetricsAction function so that values can be recorded with corresponding key names. It is relatively more relaxed than `n-auto-logger`.
```js
// it would search for .service field in `meta` or `paramsOrArgs`
// servie default to `undefined`
const someFunction = (paramsOrArgs: Object, meta: ?Object) => {};

autoMetricsAction(someFunction)(paramsOrArgs, meta);
```

### operation function format

The operation function use the pattern of `try-catch-next-throw`:

```js
const operationFunction = (meta, req, res, next) => {
  try{
    // main code
    // functions that can potentially throw errors
    // without the try-catch-next-throw pattern those errors may not be next to error handler
  } catch(e) {
      // ensure the error would be handled by the error handler, 
      // or you can write the error handling code in the catch block
      next(e);
      // further throw the error to the higher order enhancer function
      // error caught in the enhancer function would then be parsed and logged
      throw(e);
  }
}
```

### use with other enhancers

`autoMetricsOp` would return an operation function, so that other enhancers can be further chained before `toMiddleware`

```js
export default compose(toMiddleware, autoMetricsOp, autoLogOp)(operationFunction);
export default compose(toMiddlewares, autoMetricsOps, autoLogOps)(operationBundle);
export default compose(autoMetricsAction, autoLogAction)(callFunction);
export default compose(autoMetricsActions, autoLogActions('service-name'))(callFunctionBundle);
```

### reserved fields

* `operation` default to `operationFunction.name`
* `action` default to `callFunction.name`
* `service` default to `undefined`, can be specified in `paramsOrArgs` or `meta`(`autoLogActions('service-name')`)
* `category` [NError](https://github.com/financial-times/n-error) category would be recorded in metrics
* `type` is used by convention to record custom error type names for monitoring and debugging
* `status` in error object would be recorded for service action call failure

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

## development
* `make install` or `yarn`
* `yarn test --watch` to automatically run test on changing src
* `yarn watch` to automatically correct code format on saving src
