import { initAutoMetrics } from '../init';
import metricsAction from '../action';

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

		it('takes the service name/operation value in paramsOrArgs.meta if not available in meta', () => {
			const callFunction = () => null;
			const meta = { service: 'foo', operation: 'bar' };
			const args = { a: 'test', meta };
			metricsAction(callFunction)(args);
			expect(metrics.count.mock.calls).toMatchSnapshot();
		});

		it('takes the service name/operation value in paramsOrArgs if not available in meta or paramsOrArgs.meta', () => {
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
});

describe('metricsAction when input operation function bundle', () => {
	beforeAll(() => {
		initAutoMetrics(metrics);
	});

	afterEach(() => {
		jest.resetAllMocks();
	});

	it('throw Error if service name has space', async () => {
		const actionFunction = () => {};
		const enhanced = metricsAction(actionFunction);
		const meta = { service: 'mock service' };
		expect(() => enhanced({}, meta)).toThrowErrorMatchingSnapshot();
	});
});
