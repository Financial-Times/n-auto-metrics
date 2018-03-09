import express from 'express';
import request from 'supertest';
import compose from 'compose-function';
import logger, {
	autoLogOp,
	autoLogOps,
	autoLogAction,
} from '@financial-times/n-auto-logger';

import { initAutoMetrics } from '../init';
import { autoMetricsAction } from '../action';
import {
	toMiddleware,
	toMiddlewares,
	autoMetricsOp,
	autoMetricsOps,
} from '../operation';

logger.info = jest.fn();
logger.warn = jest.fn();
logger.error = jest.fn();

const metrics = {
	count: jest.fn(),
};

/* eslint-disable no-unused-vars */
const commonErrorHanlder = (err, req, res, next) => {
	res.status(err.status).send(err);
};
/* eslint-enable no-unused-vars */

describe('autoMetricsOp', () => {
	beforeAll(() => {
		initAutoMetrics(metrics);
	});

	afterEach(() => {
		jest.resetAllMocks();
	});

	describe('toMiddleware', () => {
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

	describe('autoMetricsOp', () => {
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

describe('autoMetricsOps and toMiddlewares', () => {
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
