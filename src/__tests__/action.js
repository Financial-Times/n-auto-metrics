import compose from 'compose-function';
import logger, {
	autoLogAction,
	autoLogActions,
} from '@financial-times/n-auto-logger';

import { initAutoMetrics } from '../init';
import { autoMetricsAction, autoMetricsActions } from '../action';

logger.info = jest.fn();
logger.warn = jest.fn();
logger.error = jest.fn();

const metrics = {
	count: jest.fn(),
};

describe('autoMetricsAction', () => {
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

describe('autoMetricsActions', () => {
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
