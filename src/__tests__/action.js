import logger, { logAction, compose } from '@financial-times/n-auto-logger';

import { initAutoMetrics } from '../init';
import metricsAction from '../action';
import { tagService } from '../index';

logger.info = jest.fn();
logger.warn = jest.fn();
logger.error = jest.fn();

const metrics = {
	count: jest.fn(),
};

describe('metricsAction', () => {
	beforeAll(() => {
		initAutoMetrics(metrics);
	});

	afterEach(() => {
		jest.resetAllMocks();
	});

	it('record callFunction name as action name', async () => {
		const callFunction = () => null;
		metricsAction(callFunction)();
		expect(metrics.count.mock.calls).toMatchSnapshot();
	});

	it('returns an enhanced function with a configurable .name same as callFunction', async () => {
		const callFunction = () => null;
		const enhancedFunction = metricsAction(callFunction);
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
			const execution = metricsAction(callFunction);
			expect(execution).toThrowErrorMatchingSnapshot();
			initAutoMetrics(metrics);
		});

		it('service name is not string', async () => {
			const callFunction = () => null;
			const execution = () => metricsAction(callFunction)({ service: 1 });
			expect(execution).toThrowErrorMatchingSnapshot();
		});

		it('service name has space', async () => {
			const callFunction = () => null;
			const execution = () =>
				metricsAction(callFunction)({ service: 'foo bar' });
			expect(execution).toThrowErrorMatchingSnapshot();
		});
	});

	describe('enhance async function', () => {
		it('should invoke callFunction correctly', async () => {
			const callFunction = jest.fn(() => Promise.resolve('foo'));
			const params = { test: 'a' };
			const meta = { meta: 'b' };
			const result = await metricsAction(callFunction)(params, meta);
			expect(callFunction.mock.calls).toMatchSnapshot();
			const expectedResult = await callFunction(params, meta);
			expect(result).toBe(expectedResult);
		});

		it('should record callFunction success correctly', async () => {
			const callFunction = () => Promise.resolve('foo');
			await metricsAction(callFunction)();
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
				await metricsAction(callFunction)();
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
			const result = metricsAction(callFunction)(params, meta);
			expect(callFunction.mock.calls).toMatchSnapshot();
			const expectedResult = callFunction(params, meta);
			expect(result).toBe(expectedResult);
		});

		it('should record callFunction success correctly', () => {
			const callFunction = () => 'foo';
			metricsAction(callFunction)();
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
				metricsAction(callFunction)();
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
			metricsAction(callFunction)(params, meta);
			expect(metrics.count.mock.calls).toMatchSnapshot();
		});

		it('takes the service name/operation value in paramsOrArgs if not available in meta', () => {
			const callFunction = () => null;
			const args = { a: 'test', service: 'foo', operation: 'bar' };
			metricsAction(callFunction)(args);
			expect(metrics.count.mock.calls).toMatchSnapshot();
		});

		it('uses default service name "undefined" and undefined operation if not available in args', () => {
			const callFunction = () => null;
			const args = { a: 'test' };
			metricsAction(callFunction)(args);
			expect(metrics.count.mock.calls).toMatchSnapshot();
		});
	});

	describe('used after logAction from n-auto-logger', () => {
		it('log and record metrics correctly in callFunction success', () => {
			const callFunction = () => null;
			const params = { a: 'test' };
			const meta = { service: 'foo', operation: 'bar' };
			const enhancedFunction = compose(metricsAction, logAction)(callFunction);
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
			const enhancedFunction = compose(metricsAction, logAction)(callFunction);
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

	describe('used before logAction from n-auto-logger', () => {
		it('log and record metrics correctly in callFunction success', () => {
			const callFunction = () => null;
			const params = { a: 'test' };
			const meta = { service: 'foo', operation: 'bar' };
			const enhancedFunction = compose(logAction, metricsAction)(callFunction);
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
			const enhancedFunction = compose(logAction, metricsAction)(callFunction);
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

describe('metricsAction when input operation function bundle', () => {
	beforeAll(() => {
		initAutoMetrics(metrics);
	});

	afterEach(() => {
		jest.resetAllMocks();
	});

	it('decorate each method correctly', async () => {
		const callFunctionA = jest.fn();
		const callFunctionB = jest.fn();
		const enhancedService = metricsAction({
			callFunctionA,
			callFunctionB,
		});
		const paramsA = { test: 'a' };
		const paramsB = { test: 'b' };
		const meta = { operation: 'mock-operation', service: 'mock-service' };
		await enhancedService.callFunctionA(paramsA, meta);
		await enhancedService.callFunctionB(paramsB, meta);
		expect(callFunctionA.mock.calls).toMatchSnapshot();
		expect(callFunctionB.mock.calls).toMatchSnapshot();
		expect(metrics.count.mock.calls).toMatchSnapshot();
	});

	it('throw Error if service name has space', async () => {
		const actionFunction = () => {};
		const enhanced = metricsAction(actionFunction);
		const meta = { service: 'mock service' };
		expect(() => enhanced({}, meta)).toThrowErrorMatchingSnapshot();
	});

	describe('used after logAction', () => {
		it('log and record metrics correctly when callFunction success', async () => {
			const callFunctionA = jest.fn();
			const callFunctionB = jest.fn();
			const enhancedService = compose(
				tagService('mock-service'),
				metricsAction,
				logAction,
			)({
				callFunctionA,
				callFunctionB,
			});
			const paramsA = { test: 'a' };
			const paramsB = { test: 'b' };
			const meta = { operation: 'mock-operation' };
			await enhancedService.callFunctionA(paramsA, meta);
			await enhancedService.callFunctionB(paramsB, meta);
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
				tagService('mock-service'),
				metricsAction,
				logAction,
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

	describe('used before logAction', () => {
		it('log and record metrics correctly when callFunction success ', async () => {
			const callFunctionA = jest.fn();
			const callFunctionB = jest.fn();
			const enhancedService = compose(
				tagService('mock-service'),
				logAction,
				metricsAction,
			)({
				callFunctionA,
				callFunctionB,
			});
			const paramsA = { test: 'a' };
			const paramsB = { test: 'b' };
			const meta = { operation: 'mock-operation' };
			await enhancedService.callFunctionA(paramsA, meta);
			await enhancedService.callFunctionB(paramsB, meta);
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
				tagService('mock-service'),
				logAction,
				metricsAction,
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
