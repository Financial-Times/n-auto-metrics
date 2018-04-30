import express from 'express';
import request from 'supertest';
import compose from 'compose-function';
import logger, {
	logOperation,
	logAction,
} from '@financial-times/n-auto-logger';

import { toMiddleware } from '../index';
import { initAutoMetrics } from '../init';
import metricsAction from '../action';
import metricsOperation from '../operation';

logger.info = jest.fn();
logger.warn = jest.fn();
logger.error = jest.fn();

const metrics = {
	count: jest.fn(),
};

initAutoMetrics(metrics);

/* eslint-disable no-unused-vars */
const commonErrorHandler = (err, req, res, next) => {
	res.status(err.status).send(err);
};
/* eslint-enable no-unused-vars */
const commonErrorInstance = { status: 404, message: 'Not Found' };
const errorOperationFunction = () => {
	throw commonErrorInstance;
};

describe('metricsOperation', () => {
	afterEach(() => {
		jest.resetAllMocks();
	});

	it('throw Error if metrics instance was not set', async () => {
		initAutoMetrics(undefined);
		const operationFunction = () => {};
		try {
			await metricsOperation(operationFunction)();
		} catch (e) {
			expect(e).toMatchSnapshot();
		}
		initAutoMetrics(metrics);
	});

	describe('returns a valid operation function', () => {
		it('the standard argument length', () => {
			const operationFunction = () => {};
			const enhanced = metricsOperation(operationFunction);
			expect(enhanced).toHaveLength(3);
		});

		it('executes correctly', () => {
			const callFunction = jest.fn();
			const operationFunction = () => {
				callFunction();
			};
			const enhanced = metricsOperation(operationFunction);
			enhanced();
			expect(callFunction.mock.calls).toHaveLength(1);
			enhanced();
			expect(callFunction.mock.calls).toHaveLength(2);
		});

		it('throws error correctly', async () => {
			const operationFunction = errorOperationFunction;
			const enhanced = metricsOperation(operationFunction);
			try {
				await enhanced();
			} catch (e) {
				expect(e).toBe(commonErrorInstance);
			}
		});
	});

	describe('record metrics correctly', () => {
		describe('operation success of', () => {
			it('async function with metricsAction sub action', async () => {
				const callFunction = () => {};
				const operationFunction = async meta => {
					await metricsAction(callFunction)(undefined, meta);
				};
				await metricsOperation(operationFunction)();
				expect(metrics.count.mock.calls).toMatchSnapshot();
			});

			it('non-async function with metricsAction sub action', async () => {
				const callFunction = () => {};
				const operationFunction = meta => {
					metricsAction(callFunction)(undefined, meta);
				};
				await metricsOperation(operationFunction)();
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
				const middleware = compose(toMiddleware, metricsOperation)(
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
				const middleware = compose(toMiddleware, metricsOperation)(
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
				const operation = () => {
					throw errorInstance;
				};
				try {
					await metricsOperation(operation)();
				} catch (e) {
					expect(e).toBe(errorInstance);
					expect(metrics.count.mock.calls).toMatchSnapshot();
				}
			});

			it('async function', async () => {
				const errorInstance = {
					status: 500,
					message: 'foo',
					category: 'CUSTOM_ERROR',
					type: 'MOCK_ERROR_TYPE',
				};
				const operation = async () => {
					throw errorInstance;
				};
				try {
					await metricsOperation(operation)();
				} catch (e) {
					expect(e).toBe(errorInstance);
					expect(metrics.count.mock.calls).toMatchSnapshot();
				}
			});
		});
	});

	describe('used before logOperation from n-auto-logger', () => {
		it('record correctly in operation success with enhanced sub action', async () => {
			const callFunction = () => {};
			const enhancedCallFunction = compose(logAction, metricsAction)(
				callFunction,
			);
			const operationFunction = meta => {
				enhancedCallFunction(undefined, meta);
			};
			const enhancedOperation = compose(logOperation, metricsOperation)(
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
			const enhancedCallFunction = compose(logAction, metricsAction)(
				callFunction,
			);
			const operationFunction = meta => {
				enhancedCallFunction(undefined, meta);
			};
			const enhancedOperation = compose(logOperation, metricsOperation)(
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

	describe('used after logOperation from n-auto-logger', () => {
		it('record correctly in operation success with enhanced sub action', async () => {
			const callFunction = () => {};
			const enhancedCallFunction = compose(logAction, metricsAction)(
				callFunction,
			);
			const operationFunction = meta => {
				enhancedCallFunction(undefined, meta);
			};
			const enhancedOperation = compose(metricsOperation, logOperation)(
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
			const enhancedCallFunction = compose(logAction, metricsAction)(
				callFunction,
			);
			const operationFunction = meta => {
				enhancedCallFunction(undefined, meta);
			};
			const enhancedOperation = compose(metricsOperation, logOperation)(
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

describe('metricsOperation and toMiddleware', () => {
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
		const enhancedController = compose(toMiddleware, metricsOperation)({
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

	describe('used after logOperation', () => {
		it('set anonymous function names as per property name correctly', async () => {
			const createOperationFunction = () => (meta, req, res) => {
				res.status(200).send(meta);
			};
			const operationFunctionA = createOperationFunction();
			const operationFunctionB = createOperationFunction();
			const enhancedController = compose(
				toMiddleware,
				metricsOperation,
				logOperation,
			)({
				operationFunctionA,
				operationFunctionB,
			});
			expect(enhancedController.operationFunctionA.name).toBe(
				'operationFunctionA',
			);
			expect(enhancedController.operationFunctionB.name).toBe(
				'operationFunctionB',
			);
			const app = express();
			app.use('/a', enhancedController.operationFunctionA);
			app.use('/b', enhancedController.operationFunctionB);
			const resA = await request(app).get('/a');
			expect(resA.statusCode).toBe(200);
			expect(resA.body).toMatchSnapshot();
			const resB = await request(app).get('/b');
			expect(resB.statusCode).toBe(200);
			expect(resB.body).toMatchSnapshot();
			expect(metrics.count.mock.calls).toMatchSnapshot();
			expect(logger.info.mock.calls).toMatchSnapshot();
			expect(logger.warn.mock.calls).toMatchSnapshot();
			expect(logger.error.mock.calls).toMatchSnapshot();
		});

		it('log and record metrics correctly when callFunction success', async () => {
			const content = { foo: 'bar' };
			const methodA = (meta, req, res) => {
				res.status(200).send(content);
			};
			const methodB = (meta, req, res) => {
				res.status(200).send(content);
			};
			const enhancedController = compose(
				toMiddleware,
				metricsOperation,
				logOperation,
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
			const operationFunction = () => {
				throw errorInstance;
			};
			const enhancedController = compose(
				toMiddleware,
				metricsOperation,
				logOperation,
			)({
				operationFunction,
			});
			const app = express();
			app.use('/', enhancedController.operationFunction, commonErrorHandler);
			const res = await request(app).get('/');
			expect(res.statusCode).toBe(errorInstance.status);
			expect(res.body.message).toEqual(errorInstance.message);
			expect(metrics.count.mock.calls).toMatchSnapshot();
			expect(logger.info.mock.calls).toMatchSnapshot();
			expect(logger.warn.mock.calls).toMatchSnapshot();
			expect(logger.error.mock.calls).toMatchSnapshot();
		});
	});

	describe('used before logOperation', () => {
		it('set anonymous function names as per property name correctly', async () => {
			const createOperationFunction = () => (meta, req, res) => {
				res.status(200).send(meta);
			};
			const operationFunctionA = createOperationFunction();
			const operationFunctionB = createOperationFunction();
			const enhancedController = compose(
				toMiddleware,
				logOperation,
				metricsOperation,
			)({
				operationFunctionA,
				operationFunctionB,
			});
			expect(enhancedController.operationFunctionA.name).toBe(
				'operationFunctionA',
			);
			expect(enhancedController.operationFunctionB.name).toBe(
				'operationFunctionB',
			);
			const app = express();
			app.use('/a', enhancedController.operationFunctionA);
			app.use('/b', enhancedController.operationFunctionB);
			const resA = await request(app).get('/a');
			expect(resA.statusCode).toBe(200);
			expect(resA.body).toMatchSnapshot();
			const resB = await request(app).get('/b');
			expect(resB.statusCode).toBe(200);
			expect(resB.body).toMatchSnapshot();
			expect(metrics.count.mock.calls).toMatchSnapshot();
			expect(logger.info.mock.calls).toMatchSnapshot();
			expect(logger.warn.mock.calls).toMatchSnapshot();
			expect(logger.error.mock.calls).toMatchSnapshot();
		});

		it('log and record metrics correctly when callFunction success', async () => {
			const content = { foo: 'bar' };
			const methodA = (meta, req, res) => {
				res.status(200).send(content);
			};
			const methodB = (meta, req, res) => {
				res.status(200).send(content);
			};
			const enhancedController = compose(
				toMiddleware,
				logOperation,
				metricsOperation,
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
			const operationFunction = () => {
				throw errorInstance;
			};
			const enhancedController = compose(
				toMiddleware,
				logOperation,
				metricsOperation,
			)({
				operationFunction,
			});
			const app = express();
			app.use('/', enhancedController.operationFunction, commonErrorHandler);
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
