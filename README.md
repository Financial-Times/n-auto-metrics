# n-auto-logger 

[![npm version](https://badge.fury.io/js/%40financial-times%2Fn-auto-logger.svg)](https://badge.fury.io/js/%40financial-times%2Fn-auto-logger) [![CircleCI](https://circleci.com/gh/Financial-Times/n-auto-logger.svg?style=shield)](https://circleci.com/gh/Financial-Times/n-auto-logger) [![Coverage Status](https://coveralls.io/repos/github/Financial-Times/n-auto-logger/badge.svg?branch=master)](https://coveralls.io/github/Financial-Times/n-auto-logger?branch=master) 
[![Known Vulnerabilities](https://snyk.io/test/github/Financial-Times/n-auto-logger/badge.svg)](https://snyk.io/test/github/Financial-Times/n-auto-logger) [![Scrutinizer Code Quality](https://scrutinizer-ci.com/g/Financial-Times/n-auto-logger/badges/quality-score.png?b=master)](https://scrutinizer-ci.com/g/Financial-Times/n-auto-logger/?branch=master)

[![Dependencies](https://david-dm.org/Financial-Times/n-auto-logger.svg)](https://david-dm.org/Financial-Times/n-auto-logger)  [![devDependencies](https://david-dm.org/Financial-Times/n-auto-logger/dev-status.svg)](https://david-dm.org/Financial-Times/n-auto-logger?type=dev)

auto log function calls in operation/action model with a single line of code, based on [n-logger](https://github.com/Financial-Times/n-logger)

<br>

- [quickstart](#quickstart)
- [install](#install)
- [usage](#usage)
   * [action function signature](#action-function-signature)
   * [operation function error handling](#operation-function-error-handling)
   * [filter user/handler field](#filter-userhandler-field)
   * [reserved filed override](#reserved-field-override)
   * [test stub](#test-stub)
- [built-in](#built-in)
   * [out-of-box error parsing support](#out-of-box-error-parsing-support)
   * [clean up log object](#clean-up-log-object)
- [example](#example)
- [development](#development)
- [todos](#todos)

<br>

## quickstart
```js
import { 
  autoLogAction, 
  autoLogActions, 
  autoLogOp,
  autoLogOps,
  loggerEvent,
} from '@financial-times/n-auto-logger';
```

```js
// auto log a function of its start, success/failure state with function name as `action`
const result = autoLogAction(someFunction)(args: Object, meta?: Object);
```
> more details on [action function signature](#action-function-signature)

```js
// auto log multiple functions wrapped in an object
const APIService = autoLogActions({ methodA, methodB, methodC });
```

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
export autoLogOp(operationFunction);
```
> more details on [operation function error handling](#operation-function-error-handling)

```js
// auto log multiple operation functions wrapped in an object as controller
const someController = autoLogOps({ operationFunctionA, operationFuncitonB });
```

```js
// log both operation and actions together
const operationFunction = async (meta, req, res, next) => {
  const data = await APIService.methodA(params, meta); // from autoLogActions
  next();
};
export autoLogOp(operationFunction);

app.use(someMiddleware)
```

```js
// log operation and adhoc actions, autoLogAction(someFunction) is recommended
const event = loggerEvent(meta);

try {
    event.action('someAction').success();
    event.success();
} catch(e) {
    event.failure(e);
}
```


```js
// set key names of fields to be muted in .env to reduce log for development or filter fields in production
LOGGER_MUTE_FIELDS=transactionId, userId
```

## install
```shell
npm install @financial-times/n-auto-logger
```

## usage

### action function signature

`n-auto-logger` allows two objects as the args of the autoLogged function so that values can be logged with corresponding key names.
```js
// you can auto log the call with meta, even if it is not mandatory to the function
const someFunction = ({ argsA, argsB }) => {};
autoLogAction(someFunction)(args, meta);
autoLogAction(someFunction)(argsAndMeta);

// if you need to pass certain meta in the function call
const someFunction = ({ paramsA, paramsB }, { metaA, metaB }) => {};

// if you need to do input params validation (e.g. before an API call)
const someFunction = (mandatory: Object, optional?: Object ={}) => {
  validate(mandatory);
  // ...
};
```

> The package would throw Errors if function signature is incorrect for `autoLogAction`.

### operation function error handling

### filter user/handler field
```js
// data under `user` field in meta wouldn't be logged, sensitive personal data could be put here
const meta = { operation, user: { id, email } };
const event = eventLogger(meta);

// data under `user` field in error wouldn't be logged, message to be rendered on UI could be put here
const error = { status, message, user: { message } };
event.failure(error);

// both the above filter built-in
const someFunction = (args, { metaA, user }) => {
  try {
    //...
    someCall(user);
    //...
  } catch (e) {
    e.user = { message: 'some message to be displayed on UI' };
    throw e;
  }
}
autoLogAction(someFunction)(args, meta);
````
```js
// .handler field wouldn't be recorded in logger, as it is only useful for error handler
  try {
    throw nError({
      status: 404,
      handler: 'REDIRECT_TO_INDEX',
    });
  } catch (e) {
    event.failure(e);
    next(e);
  }
````

### reserved field override
`n-auto-logger` will append values to following reserved fields automatically, the values would be overriden by the key value of the same name in your `args/params/meta` or error object, be cautious not to override them unintentionally.
* `operation` default to `operationFunction.name`
* `action` default to `callFunction.name`
* `category` default to `FETCH_RESPONSE_ERROR/FETCH_NETWORK_ERROR/NODE_SYSTEM_ERROR/CUSTOM_ERROR`
* `result` default to `success/failure`

### test stub

```js
import logger from '@financial-times/n-auto-logger'; // the underlying logger instance (`n-logger`)

sandbox.stub(logger);
```

## built-in

### out-of-box error parsing support

`n-auto-logger` would parse different forms of the following error objects to logger-suitable format automatically([detail](src/failure.js)), while it still logs plain object and string message.
* Fetch Response Error `content-type`:`application/json`,`text/plain`,`text/html`
* Fetch (Network) Error
* Node native Error objects
* Custom objects extends native Error object
* [NError](https://github.com/Financial-Times/n-error)

### clean up log object

`n-auto-logger` would trim any empty fields and method fields in the input meta or error objects automatically to concise log ([detail](src/index.js)), you shouldn't be concerned about passing excessive meta fields or extend Error object with methods.

## example
[before/after](example/EXAMPLE.md)

[enhanced api service example](https://github.com/Financial-Times/newspaper-mma/blob/master/server/apis/newspaper-info-svc.js)

[controller example](https://github.com/Financial-Times/newspaper-mma/blob/master/server/routes/delivery-address/controller.js)

## development
* `make install` or `yarn`
* `yarn test --watch` to automatically run test on changing src
* `yarn watch` to automatically correct code format on saving src

## todos
* minified output with webpack/uglify/prepack with dist/index.min.js tested, [bundlesize badge](https://unpkg.com/#/)
* logger coverage measurement in test
