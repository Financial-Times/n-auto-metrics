import { initAutoMetrics } from '../init';
import metricsOperation from '../operation';

const metrics = {
	count: jest.fn(),
};

describe('metricsOperation', () => {
	beforeAll(() => {
		initAutoMetrics(metrics);
	});

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

	describe('can enhance sync operationFunction', () => {
		const monitorFunction = jest.fn();
		const errorInstance = { status: 404, message: 'Not Found' };
		const operationFunction = (req, res) => {
			monitorFunction(req.meta);
			if (req.error) {
				throw errorInstance;
			}
			res.send();
		};
		const enhancedOperation = metricsOperation(operationFunction);
		const mockRes = {
			send: jest.fn(),
		};
		const errorReq = {
			error: true,
		};

		it('to metrics operationFunction name as operation name', () => {
			enhancedOperation({}, mockRes);
			expect(metrics.count.mock.calls).toMatchSnapshot();
		});

		it('to invoke operationFunction with operationFunction name in req.meta.operation', () => {
			enhancedOperation({}, mockRes);
			expect(monitorFunction.mock.calls).toMatchSnapshot();
			expect(mockRes.send).toHaveBeenCalled();
		});

		it('to metrics operaitonFunction on success', () => {
			enhancedOperation({}, mockRes);
			expect(metrics.count.mock.calls).toMatchSnapshot();
		});

		it('inherit meta.segment passed to req.meta from previous middleware and metrics them', () => {
			const reqWithMeta = { meta: { segment: 'mock-segment' } };
			enhancedOperation(reqWithMeta, mockRes);
			expect(metrics.count.mock.calls).toMatchSnapshot();
		});

		it('to metrics operationFunction on failure and throw the caught error', async () => {
			try {
				await enhancedOperation(errorReq, mockRes);
			} catch (e) {
				expect(e).toBe(errorInstance);
				expect(metrics.count.mock.calls).toMatchSnapshot();
			}
		});
	});

	describe('can enhance async operationFunction', () => {
		const monitorFunction = jest.fn();
		const errorInstance = { status: 404, message: 'Not Found' };
		const operationFunction = async (req, res) => {
			await monitorFunction(req.meta);
			if (req.error) {
				throw errorInstance;
			}
			res.send();
		};
		const enhancedOperation = metricsOperation(operationFunction);
		const mockRes = {
			send: jest.fn(),
		};
		const errorReq = {
			error: true,
		};

		it('to metrics operationFunction name as operation name', async () => {
			await enhancedOperation({}, mockRes);
			expect(metrics.count.mock.calls).toMatchSnapshot();
		});

		it('to invoke operationFunction with operationFunction name in req.meta.operation', async () => {
			await enhancedOperation({}, mockRes);
			expect(monitorFunction.mock.calls).toMatchSnapshot();
			expect(mockRes.send).toHaveBeenCalled();
		});

		it('to metrics operaitonFunction on success', async () => {
			await enhancedOperation({}, mockRes);
			expect(metrics.count.mock.calls).toMatchSnapshot();
		});

		it('inherit meta.segment passed to req.meta from previous middleware and metrics them', async () => {
			const reqWithMeta = { meta: { segment: 'mock-segment' } };
			await enhancedOperation(reqWithMeta, mockRes);
			expect(metrics.count.mock.calls).toMatchSnapshot();
		});

		it('to metrics operationFunction on failure and throw the caught error', async () => {
			try {
				await enhancedOperation(errorReq, mockRes);
			} catch (e) {
				expect(e).toBe(errorInstance);
				expect(metrics.count.mock.calls).toMatchSnapshot();
			}
		});
	});
});
