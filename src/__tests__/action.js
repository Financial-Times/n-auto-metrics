import { initAutoMetrics } from '../init';
import { autoMetricsAction, autoMetricsActions } from '../action';

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

	describe('should throw error', () => {
		it('if metrics was not initialised', async () => {
			initAutoMetrics(undefined);
			const callFunction = () => null;
			const execution = autoMetricsAction(callFunction);
			expect(execution).toThrowErrorMatchingSnapshot();
			initAutoMetrics(metrics);
		});

		it('namespace is not string', async () => {
			const callFunction = () => null;
			const execution = () => autoMetricsAction(callFunction)({ namespace: 1 });
			expect(execution).toThrowErrorMatchingSnapshot();
		});

		it('namespace has space', async () => {
			const callFunction = () => null;
			const execution = () =>
				autoMetricsAction(callFunction)({ namespace: 'foo bar' });
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

		it('should log callFunction success correctly', async () => {
			const callFunction = () => Promise.resolve('foo');
			await autoMetricsAction(callFunction)();
			expect(metrics.count.mock.calls).toMatchSnapshot();
		});

		it('should log callFunction failure correctly and throw the original exception', async () => {
			const errorInstance = { message: 'bar' };
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

	describe('non-async function', () => {
		it('should invoke callFunction correctly', () => {
			const callFunction = jest.fn(() => 'foo');
			const params = { test: 'a' };
			const meta = { meta: 'b' };
			const result = autoMetricsAction(callFunction)(params, meta);
			expect(callFunction.mock.calls).toMatchSnapshot();
			const expectedResult = callFunction(params, meta);
			expect(result).toBe(expectedResult);
		});

		it('should log callFunction success correctly', () => {
			const callFunction = () => 'foo';
			autoMetricsAction(callFunction)();
			expect(metrics.count.mock.calls).toMatchSnapshot();
		});

		it('should log callFunction failure correctly and throw the original exception', () => {
			const errorInstance = { message: 'bar' };
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
		it('takes the namespace/operation value in meta first if available', () => {
			const callFunction = () => null;
			const params = { a: 'test' };
			const meta = { namespace: 'foo', operation: 'bar' };
			autoMetricsAction(callFunction)(params, meta);
			expect(metrics.count.mock.calls).toMatchSnapshot();
		});

		it('takes the namespace/operation value in paramsOrArgs if not available in meta', () => {
			const callFunction = () => null;
			const args = { a: 'test', namespace: 'foo', operation: 'bar' };
			autoMetricsAction(callFunction)(args);
			expect(metrics.count.mock.calls).toMatchSnapshot();
		});

		it('uses default namespace "action" and undefined operation if not available in args', () => {
			const callFunction = () => null;
			const args = { a: 'test' };
			autoMetricsAction(callFunction)(args);
			expect(metrics.count.mock.calls).toMatchSnapshot();
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
		expect(callFunctionA.mock.calls).toMatchSnapshot();
		expect(callFunctionB.mock.calls).toMatchSnapshot();
		expect(metrics.count.mock.calls).toMatchSnapshot();
	});
});
