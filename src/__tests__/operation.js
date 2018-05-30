import express from 'express';
import request from 'supertest';

import { toMiddleware, compose } from '../index';
import { initAutoMetrics } from '../init';
import metricsAction from '../action';
import metricsOperation from '../operation';

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

			it('req.meta.segment from previous middlewares if available', async () => {
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
				const middleware = compose(
					toMiddleware,
					metricsOperation,
				)(operationFunction);
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
});
