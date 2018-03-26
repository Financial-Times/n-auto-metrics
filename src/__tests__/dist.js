import compose from 'compose-function';
import express from 'express';
import request from 'supertest';
import logger, {
	autoLogAction,
	autoLogActions,
	autoLogOp,
	autoLogOps,
} from '@financial-times/n-auto-logger';

import {
	initAutoMetrics,
	getMetricsInstance,
	autoMetricsAction,
	autoMetricsActions,
	autoMetricsOp,
	autoMetricsOps,
	toMiddleware,
	toMiddlewares,
} from '../../dist';

/* eslint-disable jest/no-disabled-tests */
const release = (name, _test) =>
	process.env.RELEASE_TEST ? describe(name, _test) : describe.skip(name, _test);
/* eslint-enable jest/no-disabled-tests */

logger.info = jest.fn();
logger.warn = jest.fn();
logger.error = jest.fn();

release('initAutoMetrics', () => {
	it('would store the metrics instance that can be got', () => {
		const instance = { foo: 'bar' };
		initAutoMetrics(instance);
		const metrics = getMetricsInstance();
		expect(metrics).toBe(instance);
	});
});

release('getMetricsInstance', () => {
	it('should repeatedly get the stored instance after init', () => {
		const instance = { foo: 'bar' };
		initAutoMetrics(instance);
		expect(getMetricsInstance()).toBe(instance);
		expect(getMetricsInstance()).toBe(instance);
	});
});

const metrics = {
	count: jest.fn(),
};

release('autoMetricsAction', () => {
	beforeAll(() => {
		initAutoMetrics(metrics);
	});

	afterEach(() => {
		jest.resetAllMocks();
	});

	it('record callFunction name as action name', async () => {
		const callFunction = () => null;
		autoMetricsAction(callFunction)();
		expect(metrics.count.mock.calls).toMatchSnapshot();
	});

	it('returns an enhanced function with a configurable .name same as callFunction', async () => {
		const callFunction = () => null;
		const enhancedFunction = autoMetricsAction(callFunction);
		expect(enhancedFunction.name).toEqual(callFunction.name);
		Object.defineProperty(enhancedFunction, 'name', {
			value: 'test',
			configurable: true,
		});
		expect(enhancedFunction.name).toBe('test');
	});

	describe('should throw error', () => {
		it('if metrics was not initialised', async () => {
			initAutoMetrics(undefined);
			const callFunction = () => null;
			const execution = autoMetricsAction(callFunction);
			expect(execution).toThrowErrorMatchingSnapshot();
			initAutoMetrics(metrics);
		});

		it('service name is not string', async () => {
			const callFunction = () => null;
			const execution = () => autoMetricsAction(callFunction)({ service: 1 });
			expect(execution).toThrowErrorMatchingSnapshot();
		});

		it('service name has space', async () => {
			const callFunction = () => null;
			const execution = () =>
				autoMetricsAction(callFunction)({ service: 'foo bar' });
			expect(execution).toThrowErrorMatchingSnapshot();
		});
	});

	describe('enhance async function', () => {
		it('should invoke callFunction correctly', async () => {
			const callFunction = jest.fn(() => Promise.resolve('foo'));
			const params = { test: 'a' };
			const meta = { meta: 'b' };
			const result = await autoMetricsAction(callFunction)(params, meta);
			expect(callFunction.mock.calls).toMatchSnapshot();
			const expectedResult = await callFunction(params, meta);
			expect(result).toBe(expectedResult);
		});

		it('should record callFunction success correctly', async () => {
			const callFunction = () => Promise.resolve('foo');
			await autoMetricsAction(callFunction)();
			expect(metrics.count.mock.calls).toMatchSnapshot();
		});

		it('should record callFunction failure correctly and throw the original exception', async () => {
			const errorInstance = {
				category: 'FETCH_RESPONSE_ERROR',
				type: 'SESSION_NOT_FOUND',
				message: 'bar',
			};
			const callFunction = async () => {
				throw errorInstance;
			};
			try {
				await autoMetricsAction(callFunction)();
			} catch (e) {
				expect(e).toBe(errorInstance);
				expect(metrics.count.mock.calls).toMatchSnapshot();
			}
		});
	});

	describe('enhance non-async function', () => {
		it('should invoke callFunction correctly', () => {
			const callFunction = jest.fn(() => 'foo');
			const params = { test: 'a' };
			const meta = { meta: 'b' };
			const result = autoMetricsAction(callFunction)(params, meta);
			expect(callFunction.mock.calls).toMatchSnapshot();
			const expectedResult = callFunction(params, meta);
			expect(result).toBe(expectedResult);
		});

		it('should record callFunction success correctly', () => {
			const callFunction = () => 'foo';
			autoMetricsAction(callFunction)();
			expect(metrics.count.mock.calls).toMatchSnapshot();
		});

		it('should record callFunction failure correctly and throw the original exception', () => {
			const errorInstance = {
				category: 'FETCH_RESPONSE_ERROR',
				type: 'SESSION_NOT_FOUND',
				message: 'bar',
			};
			const callFunction = () => {
				throw errorInstance;
			};
			try {
				autoMetricsAction(callFunction)();
			} catch (e) {
				expect(e).toBe(errorInstance);
				expect(metrics.count.mock.calls).toMatchSnapshot();
			}
		});
	});

	describe('args format (paramsOrArgs, meta)', () => {
		it('takes the service name/operation value in meta first if available', () => {
			const callFunction = () => null;
			const params = { a: 'test' };
			const meta = { service: 'foo', operation: 'bar' };
			autoMetricsAction(callFunction)(params, meta);
			expect(metrics.count.mock.calls).toMatchSnapshot();
		});

		it('takes the service name/operation value in paramsOrArgs if not available in meta', () => {
			const callFunction = () => null;
			const args = { a: 'test', service: 'foo', operation: 'bar' };
			autoMetricsAction(callFunction)(args);
			expect(metrics.count.mock.calls).toMatchSnapshot();
		});

		it('uses default service name "undefined" and undefined operation if not available in args', () => {
			const callFunction = () => null;
			const args = { a: 'test' };
			autoMetricsAction(callFunction)(args);
			expect(metrics.count.mock.calls).toMatchSnapshot();
		});
	});

	describe('used after autoLogAction from n-auto-logger', () => {
		it('log and record metrics correctly in callFunction success', () => {
			const callFunction = () => null;
			const params = { a: 'test' };
			const meta = { service: 'foo', operation: 'bar' };
			const enhancedFunction = compose(autoMetricsAction, autoLogAction)(
				callFunction,
			);
			enhancedFunction(params, meta);
			expect(metrics.count.mock.calls).toMatchSnapshot();
			expect(logger.info.mock.calls).toMatchSnapshot();
		});

		it('log and record metrics correctly in callFunction failure', () => {
			const errorInstance = {
				status: 404,
				category: 'FETCH_RESPONSE_ERROR',
				type: 'SESSION_NOT_FOUND',
				message: 'bar',
			};
			const callFunction = () => {
				throw errorInstance;
			};
			const params = { a: 'test' };
			const meta = { service: 'foo', operation: 'bar' };
			const enhancedFunction = compose(autoMetricsAction, autoLogAction)(
				callFunction,
			);
			try {
				enhancedFunction(params, meta);
			} catch (e) {
				expect(e).toBe(errorInstance);
				expect(metrics.count.mock.calls).toMatchSnapshot();
				expect(logger.info.mock.calls).toMatchSnapshot();
				expect(logger.warn.mock.calls).toMatchSnapshot();
				expect(logger.error.mock.calls).toMatchSnapshot();
			}
		});
	});

	describe('used before autoLogAction from n-auto-logger', () => {
		it('log and record metrics correctly in callFunction success', () => {
			const callFunction = () => null;
			const params = { a: 'test' };
			const meta = { service: 'foo', operation: 'bar' };
			const enhancedFunction = compose(autoLogAction, autoMetricsAction)(
				callFunction,
			);
			enhancedFunction(params, meta);
			expect(metrics.count.mock.calls).toMatchSnapshot();
			expect(logger.info.mock.calls).toMatchSnapshot();
		});

		it('log and record metrics correctly in callFunction failure', () => {
			const errorInstance = {
				status: 404,
				category: 'FETCH_RESPONSE_ERROR',
				type: 'SESSION_NOT_FOUND',
				message: 'bar',
			};
			const callFunction = () => {
				throw errorInstance;
			};
			const params = { a: 'test' };
			const meta = { service: 'foo', operation: 'bar' };
			const enhancedFunction = compose(autoLogAction, autoMetricsAction)(
				callFunction,
			);
			try {
				enhancedFunction(params, meta);
			} catch (e) {
				expect(e).toBe(errorInstance);
				expect(metrics.count.mock.calls).toMatchSnapshot();
				expect(logger.info.mock.calls).toMatchSnapshot();
				expect(logger.warn.mock.calls).toMatchSnapshot();
				expect(logger.error.mock.calls).toMatchSnapshot();
			}
		});
	});
});

initAutoMetrics(metrics);

release('autoMetricsActions', () => {
	afterEach(() => {
		jest.resetAllMocks();
	});

	it('decorate each method correctly', async () => {
		const callFunctionA = jest.fn();
		const callFunctionB = jest.fn();
		const enhancedService = autoMetricsActions('mock-service')({
			callFunctionA,
			callFunctionB,
		});
		const paramsA = { test: 'a' };
		const paramsB = { test: 'b' };
		const meta = { operation: 'mock-operation' };
		await enhancedService.callFunctionA(paramsA, meta);
		await enhancedService.callFunctionB(paramsB, meta);
		expect(enhancedService.callFunctionA.name).toBe('callFunctionA');
		expect(enhancedService.callFunctionB.name).toBe('callFunctionB');
		expect(callFunctionA.mock.calls).toMatchSnapshot();
		expect(callFunctionB.mock.calls).toMatchSnapshot();
		expect(metrics.count.mock.calls).toMatchSnapshot();
	});

	it('throw Error if service name has space', async () => {
		expect(autoMetricsActions('mock service')).toThrowErrorMatchingSnapshot();
	});

	describe('used after autoLogActions', () => {
		it('log and record metrics correctly when callFunction success', async () => {
			const callFunctionA = jest.fn();
			const callFunctionB = jest.fn();
			const enhancedService = compose(
				autoMetricsActions('mock-service'),
				autoLogActions,
			)({
				callFunctionA,
				callFunctionB,
			});
			const paramsA = { test: 'a' };
			const paramsB = { test: 'b' };
			const meta = { operation: 'mock-operation' };
			await enhancedService.callFunctionA(paramsA, meta);
			await enhancedService.callFunctionB(paramsB, meta);
			expect(enhancedService.callFunctionA.name).toBe('callFunctionA');
			expect(enhancedService.callFunctionB.name).toBe('callFunctionB');
			expect(callFunctionA.mock.calls).toMatchSnapshot();
			expect(callFunctionB.mock.calls).toMatchSnapshot();
			expect(metrics.count.mock.calls).toMatchSnapshot();
			expect(logger.info.mock.calls).toMatchSnapshot();
		});

		it('log and record metrics correctly when callFunction failure', async () => {
			const errorInstance = {
				status: 404,
				category: 'FETCH_RESPONSE_ERROR',
				type: 'SESSION_NOT_FOUND',
				message: 'bar',
			};
			const callFunction = () => {
				throw errorInstance;
			};
			const enhancedService = compose(
				autoMetricsActions('mock-service'),
				autoLogActions,
			)({
				callFunction,
			});
			const params = { test: 'a' };
			const meta = { operation: 'mock-operation' };
			try {
				await enhancedService.callFunction(params, meta);
			} catch (e) {
				expect(e).toBe(errorInstance);
				expect(metrics.count.mock.calls).toMatchSnapshot();
				expect(logger.info.mock.calls).toMatchSnapshot();
				expect(logger.warn.mock.calls).toMatchSnapshot();
				expect(logger.error.mock.calls).toMatchSnapshot();
			}
		});
	});

	describe('used before autoLogActions', () => {
		it('log and record metrics correctly when callFunction success ', async () => {
			const callFunctionA = jest.fn();
			const callFunctionB = jest.fn();
			const enhancedService = compose(
				autoLogActions,
				autoMetricsActions('mock-service'),
			)({
				callFunctionA,
				callFunctionB,
			});
			const paramsA = { test: 'a' };
			const paramsB = { test: 'b' };
			const meta = { operation: 'mock-operation' };
			await enhancedService.callFunctionA(paramsA, meta);
			await enhancedService.callFunctionB(paramsB, meta);
			expect(enhancedService.callFunctionA.name).toBe('callFunctionA');
			expect(enhancedService.callFunctionB.name).toBe('callFunctionB');
			expect(callFunctionA.mock.calls).toMatchSnapshot();
			expect(callFunctionB.mock.calls).toMatchSnapshot();
			expect(metrics.count.mock.calls).toMatchSnapshot();
			expect(logger.info.mock.calls).toMatchSnapshot();
		});

		it('log and record metrics correctly when callFunction failure', async () => {
			const errorInstance = {
				status: 404,
				category: 'FETCH_RESPONSE_ERROR',
				type: 'SESSION_NOT_FOUND',
				message: 'bar',
			};
			const callFunction = () => {
				throw errorInstance;
			};
			const enhancedService = compose(
				autoLogActions,
				autoMetricsActions('mock-service'),
			)({
				callFunction,
			});
			const params = { test: 'a' };
			const meta = { operation: 'mock-operation' };
			try {
				await enhancedService.callFunction(params, meta);
			} catch (e) {
				expect(e).toBe(errorInstance);
				expect(metrics.count.mock.calls).toMatchSnapshot();
				expect(logger.info.mock.calls).toMatchSnapshot();
				expect(logger.warn.mock.calls).toMatchSnapshot();
				expect(logger.error.mock.calls).toMatchSnapshot();
			}
		});
	});
});

/* eslint-disable no-unused-vars */
const commonErrorHanlder = (err, req, res, next) => {
	res.status(err.status).send(err);
};
/* eslint-enable no-unused-vars */

release('toMiddleware', () => {
	afterEach(() => {
		jest.resetAllMocks();
	});

	describe('converts a plain', () => {
		it('non-async operation function', async () => {
			const content = { foo: 'bar' };
			const operation = (meta, req, res) => {
				res.status(200).send(content);
			};
			const middleware = toMiddleware(operation);
			const app = express();
			app.use('/', middleware);
			const res = await request(app).get('/');
			expect(res.statusCode).toBe(200);
			expect(res.body).toEqual(content);
		});

		it('async operation function', async () => {
			const content = { foo: 'bar' };
			const operation = async (meta, req, res) => {
				res.status(200).send(content);
			};
			const middleware = toMiddleware(operation);
			const app = express();
			app.use('/', middleware);
			const res = await request(app).get('/');
			expect(res.statusCode).toBe(200);
			expect(res.body).toEqual(content);
		});

		it('non-async operation function throwing error', async () => {
			const errorInstance = { status: 404, message: 'Not Found' };
			const operation = (meta, req, res, next) => {
				const e = errorInstance;
				next(e);
				throw e;
			};
			const middleware = toMiddleware(operation);
			const app = express();
			app.use('/', middleware, commonErrorHanlder);
			const res = await request(app).get('/');
			expect(res.statusCode).toBe(404);
			expect(res.body.message).toBe('Not Found');
		});

		it('async operation function throwing error', async () => {
			const errorInstance = { status: 404, message: 'Not Found' };
			const operation = async (meta, req, res, next) => {
				const e = errorInstance;
				next(e);
				throw e;
			};
			const middleware = toMiddleware(operation);
			const app = express();
			app.use('/', middleware, commonErrorHanlder);
			const res = await request(app).get('/');
			expect(res.statusCode).toBe(404);
			expect(res.body.message).toBe('Not Found');
		});
	});

	describe('converts an autoMetricsOp enhanced', () => {
		it('non-async operation function', async () => {
			const content = { foo: 'bar' };
			const operation = (meta, req, res) => {
				res.status(200).send(content);
			};
			const middleware = compose(toMiddleware, autoMetricsOp)(operation);
			const app = express();
			app.use('/', middleware);
			const res = await request(app).get('/');
			expect(res.statusCode).toBe(200);
			expect(res.body).toEqual(content);
		});

		it('async operation function', async () => {
			const content = { foo: 'bar' };
			const operation = async (meta, req, res) => {
				res.status(200).send(content);
			};
			const middleware = compose(toMiddleware, autoMetricsOp)(operation);
			const app = express();
			app.use('/', middleware);
			const res = await request(app).get('/');
			expect(res.statusCode).toBe(200);
			expect(res.body).toEqual(content);
		});

		it('non-async operaiton function throwing error', async () => {
			const errorInstance = { status: 404, message: 'Not Found' };
			const operation = (meta, req, res, next) => {
				const e = errorInstance;
				next(e);
				throw e;
			};
			const middleware = compose(toMiddleware, autoMetricsOp)(operation);
			const app = express();
			app.use('/', middleware, commonErrorHanlder);
			const res = await request(app).get('/');
			expect(res.statusCode).toBe(404);
			expect(res.body.message).toBe('Not Found');
		});

		it('async operation function throwing error', async () => {
			const errorInstance = { status: 404, message: 'Not Found' };
			const operation = async (meta, req, res, next) => {
				const e = errorInstance;
				next(e);
				throw e;
			};
			const middleware = compose(toMiddleware, autoMetricsOp)(operation);
			const app = express();
			app.use('/', middleware, commonErrorHanlder);
			const res = await request(app).get('/');
			expect(res.statusCode).toBe(404);
			expect(res.body.message).toBe('Not Found');
		});
	});
});

release('autoMetricsOp', () => {
	afterEach(() => {
		jest.resetAllMocks();
	});

	it('throw Error if metrics instance was not set', async () => {
		initAutoMetrics(undefined);
		const operationFunction = () => {};
		try {
			await autoMetricsOp(operationFunction)();
		} catch (e) {
			expect(e).toMatchSnapshot();
		}
		initAutoMetrics(metrics);
	});

	describe('returns an enhanced operation function', () => {
		it('for non-async operation', async () => {
			const content = { foo: 'bar' };
			const operationFunction = (meta, req, res, next) => {
				next(content);
			};
			const enhancedOperation = autoMetricsOp(operationFunction);
			const next = jest.fn();
			await enhancedOperation(null, null, null, next);
			expect(enhancedOperation.name).toBe('operationFunction');
			expect(enhancedOperation).toHaveLength(4);
			expect(next.mock.calls).toHaveLength(1);
			expect(next.mock.calls[0][0]).toEqual(content);
		});

		it('for async operation', async () => {
			const content = { foo: 'bar' };
			const operationFunction = async (meta, req, res, next) => {
				next(content);
			};
			const enhancedOperation = autoMetricsOp(operationFunction);
			const next = jest.fn();
			await enhancedOperation(null, null, null, next);
			expect(enhancedOperation.name).toBe('operationFunction');
			expect(enhancedOperation).toHaveLength(4);
			expect(next.mock.calls).toHaveLength(1);
			expect(next.mock.calls[0][0]).toEqual(content);
		});

		it('for non-async middoperationleware throwing error', async () => {
			const errorInstance = { status: 404, message: 'Not Found' };
			const operationFunction = (meta, req, res, next) => {
				const e = errorInstance;
				next(e);
				throw e;
			};
			const enhancedOperation = autoMetricsOp(operationFunction);
			const next = jest.fn();
			try {
				await enhancedOperation(null, null, null, next);
			} catch (e) {
				expect(e).toBe(errorInstance);
				expect(next.mock.calls).toMatchSnapshot();
			}
		});

		it('for async operation throwing error', async () => {
			const errorInstance = { status: 404, message: 'Not Found' };
			const operationFunction = async (meta, req, res, next) => {
				const e = errorInstance;
				next(e);
				throw e;
			};
			const enhancedOperation = autoMetricsOp(operationFunction);
			const next = jest.fn();
			try {
				await enhancedOperation(null, null, null, next);
			} catch (e) {
				expect(e).toBe(errorInstance);
				expect(next.mock.calls).toMatchSnapshot();
			}
		});
	});

	describe('record metrics correctly', () => {
		describe('operation success of', () => {
			it('async function with autoMetricsAction sub action', async () => {
				const callFunction = () => {};
				const operationFunction = async meta => {
					await autoMetricsAction(callFunction)(undefined, meta);
				};
				await compose(toMiddleware, autoMetricsOp)(operationFunction)();
				expect(metrics.count.mock.calls).toMatchSnapshot();
			});

			it('non-async function with autoMetricsAction sub action', async () => {
				const callFunction = () => {};
				const operationFunction = meta => {
					autoMetricsAction(callFunction)(undefined, meta);
				};
				await compose(toMiddleware, autoMetricsOp)(operationFunction)();
				expect(metrics.count.mock.calls).toMatchSnapshot();
			});

			it('req.metrics.segment from previous middlewares', async () => {
				const metaMiddleware = (req, res, next) => {
					req.meta = {
						...req.meta,
						segment: 'IGNORED_USER_TYPE',
					};
					req.metrics = {
						...req.metrics,
						segment: 'MOCK_USER_TYPE',
					};
					next();
				};
				const content = { foo: 'bar' };
				const operationFunction = async (meta, req, res) => {
					res.status(200).send(content);
				};
				const middleware = compose(toMiddleware, autoMetricsOp)(
					operationFunction,
				);
				const app = express();
				app.use('/', metaMiddleware, middleware);
				const res = await request(app).get('/');
				expect(res.statusCode).toBe(200);
				expect(res.body).toEqual(content);
				expect(metrics.count.mock.calls).toMatchSnapshot();
			});

			it('req.meta.segment from previous middlewares if not set req.metrics', async () => {
				const metaMiddleware = (req, res, next) => {
					req.meta = {
						...req.meta,
						segment: 'MOCK_USER_TYPE',
					};
					next();
				};
				const content = { foo: 'bar' };
				const operationFunction = async (meta, req, res) => {
					res.status(200).send(content);
				};
				const middleware = compose(toMiddleware, autoMetricsOp)(
					operationFunction,
				);
				const app = express();
				app.use('/', metaMiddleware, middleware);
				const res = await request(app).get('/');
				expect(res.statusCode).toBe(200);
				expect(res.body).toEqual(content);
				expect(metrics.count.mock.calls).toMatchSnapshot();
			});
		});

		describe('operation failure of', () => {
			it('non-async function', async () => {
				const errorInstance = {
					status: 500,
					message: 'foo',
					category: 'CUSTOM_ERROR',
					type: 'MOCK_ERROR_TYPE',
				};
				const operation = (meta, req, res, next) => {
					try {
						throw errorInstance;
					} catch (e) {
						next(e);
						throw e;
					}
				};
				const next = jest.fn();
				try {
					await autoMetricsOp(operation)(null, null, null, next);
				} catch (e) {
					expect(e).toBe(errorInstance);
					expect(metrics.count.mock.calls).toMatchSnapshot();
					expect(next.mock.calls).toMatchSnapshot();
				}
			});

			it('async function', async () => {
				const errorInstance = {
					status: 500,
					message: 'foo',
					category: 'CUSTOM_ERROR',
					type: 'MOCK_ERROR_TYPE',
				};
				const operation = async (meta, req, res, next) => {
					try {
						throw errorInstance;
					} catch (e) {
						next(e);
						throw e;
					}
				};
				const next = jest.fn();
				try {
					await autoMetricsOp(operation)(null, null, null, next);
				} catch (e) {
					expect(e).toBe(errorInstance);
					expect(metrics.count.mock.calls).toMatchSnapshot();
					expect(next.mock.calls).toMatchSnapshot();
				}
			});
		});
	});

	describe('used before autoLogOp from n-auto-logger', () => {
		it('record correctly in operation success with enhanced sub action', async () => {
			const callFunction = () => {};
			const enhancedCallFunction = compose(autoLogAction, autoMetricsAction)(
				callFunction,
			);
			const operationFunction = meta => {
				enhancedCallFunction(undefined, meta);
			};
			const enhancedOperation = compose(autoLogOp, autoMetricsOp)(
				operationFunction,
			);
			await enhancedOperation();
			expect(enhancedOperation.name).toBe('operationFunction');
			expect(metrics.count.mock.calls).toMatchSnapshot();
			expect(logger.info.mock.calls).toMatchSnapshot();
			expect(logger.warn.mock.calls).toMatchSnapshot();
			expect(logger.error.mock.calls).toMatchSnapshot();
		});

		it('record correctly in operation failure with enhanced sub action', async () => {
			const errorInstance = {
				status: 404,
				category: 'FETCH_RESPONSE_ERROR',
				type: 'SESSION_NOT_FOUND',
				message: 'bar',
			};
			const callFunction = () => {
				throw errorInstance;
			};
			const enhancedCallFunction = compose(autoLogAction, autoMetricsAction)(
				callFunction,
			);
			const operationFunction = meta => {
				enhancedCallFunction(undefined, meta);
			};
			const enhancedOperation = compose(autoLogOp, autoMetricsOp)(
				operationFunction,
			);
			try {
				await enhancedOperation();
			} catch (e) {
				expect(e).toBe(errorInstance);
				expect(enhancedOperation.name).toBe('operationFunction');
				expect(metrics.count.mock.calls).toMatchSnapshot();
				expect(logger.info.mock.calls).toMatchSnapshot();
				expect(logger.warn.mock.calls).toMatchSnapshot();
				expect(logger.error.mock.calls).toMatchSnapshot();
			}
		});
	});

	describe('used after autoLogOp from n-auto-logger', () => {
		it('record correctly in operation success with enhanced sub action', async () => {
			const callFunction = () => {};
			const enhancedCallFunction = compose(autoLogAction, autoMetricsAction)(
				callFunction,
			);
			const operationFunction = meta => {
				enhancedCallFunction(undefined, meta);
			};
			const enhancedOperation = compose(autoMetricsOp, autoLogOp)(
				operationFunction,
			);
			await enhancedOperation();
			expect(enhancedOperation.name).toBe('operationFunction');
			expect(metrics.count.mock.calls).toMatchSnapshot();
			expect(logger.info.mock.calls).toMatchSnapshot();
			expect(logger.warn.mock.calls).toMatchSnapshot();
			expect(logger.error.mock.calls).toMatchSnapshot();
		});

		it('record correctly in operation failure with enhanced sub action', async () => {
			const errorInstance = {
				status: 404,
				category: 'FETCH_RESPONSE_ERROR',
				type: 'SESSION_NOT_FOUND',
				message: 'bar',
			};
			const callFunction = () => {
				throw errorInstance;
			};
			const enhancedCallFunction = compose(autoLogAction, autoMetricsAction)(
				callFunction,
			);
			const operationFunction = meta => {
				enhancedCallFunction(undefined, meta);
			};
			const enhancedOperation = compose(autoMetricsOp, autoLogOp)(
				operationFunction,
			);
			try {
				await enhancedOperation();
			} catch (e) {
				expect(e).toBe(errorInstance);
				expect(enhancedOperation.name).toBe('operationFunction');
				expect(metrics.count.mock.calls).toMatchSnapshot();
				expect(logger.info.mock.calls).toMatchSnapshot();
				expect(logger.warn.mock.calls).toMatchSnapshot();
				expect(logger.error.mock.calls).toMatchSnapshot();
			}
		});
	});
});

release('autoMetricsOps and toMiddlewares', () => {
	afterEach(() => {
		jest.resetAllMocks();
	});

	it('enhance and convert each method correctly', async () => {
		const content = { foo: 'bar' };
		const methodA = (meta, req, res) => {
			res.status(200).send(content);
		};
		const methodB = (meta, req, res) => {
			res.status(200).send(content);
		};
		const enhancedController = compose(toMiddlewares, autoMetricsOps)({
			methodA,
			methodB,
		});
		const app = express();
		app.use('/a', enhancedController.methodA);
		app.use('/b', enhancedController.methodB);
		const resA = await request(app).get('/a');
		expect(resA.statusCode).toBe(200);
		expect(resA.body).toEqual(content);
		const resB = await request(app).get('/b');
		expect(resB.statusCode).toBe(200);
		expect(resB.body).toEqual(content);
		expect(metrics.count.mock.calls).toMatchSnapshot();
	});

	describe('used after autoLogOps', () => {
		it('log and record metrics correctly when callFunction success', async () => {
			const content = { foo: 'bar' };
			const methodA = (meta, req, res) => {
				res.status(200).send(content);
			};
			const methodB = (meta, req, res) => {
				res.status(200).send(content);
			};
			const enhancedController = compose(
				toMiddlewares,
				autoMetricsOps,
				autoLogOps,
			)({
				methodA,
				methodB,
			});
			const app = express();
			app.use('/a', enhancedController.methodA);
			app.use('/b', enhancedController.methodB);
			const resA = await request(app).get('/a');
			expect(resA.statusCode).toBe(200);
			expect(resA.body).toEqual(content);
			const resB = await request(app).get('/b');
			expect(resB.statusCode).toBe(200);
			expect(resB.body).toEqual(content);
			expect(metrics.count.mock.calls).toMatchSnapshot();
			expect(logger.info.mock.calls).toMatchSnapshot();
			expect(logger.warn.mock.calls).toMatchSnapshot();
			expect(logger.error.mock.calls).toMatchSnapshot();
		});

		it('log and record metrics correctly when callFunction failure', async () => {
			const errorInstance = {
				status: 404,
				category: 'FETCH_RESPONSE_ERROR',
				type: 'SESSION_NOT_FOUND',
				message: 'bar',
			};
			const operationFunction = (meta, req, res, next) => {
				const e = errorInstance;
				next(e);
				throw e;
			};
			const enhancedController = compose(
				toMiddlewares,
				autoMetricsOps,
				autoLogOps,
			)({
				operationFunction,
			});
			const app = express();
			app.use('/', enhancedController.operationFunction, commonErrorHanlder);
			const res = await request(app).get('/');
			expect(res.statusCode).toBe(errorInstance.status);
			expect(res.body.message).toEqual(errorInstance.message);
			expect(metrics.count.mock.calls).toMatchSnapshot();
			expect(logger.info.mock.calls).toMatchSnapshot();
			expect(logger.warn.mock.calls).toMatchSnapshot();
			expect(logger.error.mock.calls).toMatchSnapshot();
		});
	});

	describe('used before autoLogOps', () => {
		it('log and record metrics correctly when callFunction success', async () => {
			const content = { foo: 'bar' };
			const methodA = (meta, req, res) => {
				res.status(200).send(content);
			};
			const methodB = (meta, req, res) => {
				res.status(200).send(content);
			};
			const enhancedController = compose(
				toMiddlewares,
				autoLogOps,
				autoMetricsOps,
			)({
				methodA,
				methodB,
			});
			const app = express();
			app.use('/a', enhancedController.methodA);
			app.use('/b', enhancedController.methodB);
			const resA = await request(app).get('/a');
			expect(resA.statusCode).toBe(200);
			expect(resA.body).toEqual(content);
			const resB = await request(app).get('/b');
			expect(resB.statusCode).toBe(200);
			expect(resB.body).toEqual(content);
			expect(metrics.count.mock.calls).toMatchSnapshot();
			expect(logger.info.mock.calls).toMatchSnapshot();
			expect(logger.warn.mock.calls).toMatchSnapshot();
			expect(logger.error.mock.calls).toMatchSnapshot();
		});

		it('log and record metrics correctly when callFunction failure', async () => {
			const errorInstance = {
				status: 404,
				category: 'FETCH_RESPONSE_ERROR',
				type: 'SESSION_NOT_FOUND',
				message: 'bar',
			};
			const operationFunction = (meta, req, res, next) => {
				const e = errorInstance;
				next(e);
				throw e;
			};
			const enhancedController = compose(
				toMiddlewares,
				autoLogOps,
				autoMetricsOps,
			)({
				operationFunction,
			});
			const app = express();
			app.use('/', enhancedController.operationFunction, commonErrorHanlder);
			const res = await request(app).get('/');
			expect(res.statusCode).toBe(errorInstance.status);
			expect(res.body.message).toEqual(errorInstance.message);
			expect(metrics.count.mock.calls).toMatchSnapshot();
			expect(logger.info.mock.calls).toMatchSnapshot();
			expect(logger.warn.mock.calls).toMatchSnapshot();
			expect(logger.error.mock.calls).toMatchSnapshot();
		});
	});
});
