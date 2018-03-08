import express from 'express';
import request from 'supertest';
import compose from 'compose-function';

import { initAutoMetrics } from '../init';
import { autoMetricsAction } from '../action';
import {
	toMiddleware,
	toMiddlewares,
	autoMetricsOp,
	autoMetricsOps,
} from '../operation';

const metrics = {
	count: jest.fn(),
};

describe('autoMetricsOp', () => {
	beforeAll(() => {
		initAutoMetrics(metrics);
	});

	afterEach(() => {
		jest.resetAllMocks();
	});

	describe('toMiddleware and autoMetricsOp', () => {
		describe('returns a valid enhanced express middleware', () => {
			it('for non-async middleware', async () => {
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

			it('for async middleware', async () => {
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

			it('for non-async middleware throwing error', async () => {
				const errorInstance = { status: 404, message: 'Not Found' };
				const operation = (meta, req, res, next) => {
					const e = errorInstance;
					next(e);
					throw e;
				};
				/* eslint-disable no-unused-vars */
				const errorHanlder = (err, req, res, next) => {
					res.status(err.status).send(err);
				};
				/* eslint-enable no-unused-vars */
				const middleware = compose(toMiddleware, autoMetricsOp)(operation);
				const app = express();
				app.use('/', middleware, errorHanlder);
				const res = await request(app).get('/');
				expect(res.statusCode).toBe(404);
				expect(res.body.message).toBe('Not Found');
			});

			it('for async middleware throwing error', async () => {
				const errorInstance = { status: 404, message: 'Not Found' };
				const operation = async (meta, req, res, next) => {
					const e = errorInstance;
					next(e);
					throw e;
				};
				/* eslint-disable no-unused-vars */
				const errorHanlder = (err, req, res, next) => {
					res.status(err.status).send(err);
				};
				/* eslint-enable no-unused-vars */
				const middleware = compose(toMiddleware, autoMetricsOp)(operation);
				const app = express();
				app.use('/', middleware, errorHanlder);
				const res = await request(app).get('/');
				expect(res.statusCode).toBe(404);
				expect(res.body.message).toBe('Not Found');
			});
		});
	});

	describe('logs correctly', () => {
		describe('operation success of', () => {
			it('async function with autoMetricsAction sub action', async () => {
				const callFunction = () => {};
				const operationFunction = async meta => {
					await autoMetricsAction(callFunction)(meta);
				};
				await compose(toMiddleware, autoMetricsOp)(operationFunction)();
				expect(metrics.count.mock.calls).toMatchSnapshot();
			});

			it('non-async function with autoMetricsAction sub action', async () => {
				const callFunction = () => {};
				const operationFunction = meta => {
					autoMetricsAction(callFunction)(meta);
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
});
