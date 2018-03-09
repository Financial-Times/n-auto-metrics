import {
	initAutoMetrics,
	getMetricsInstance,
	autoMetricsAction,
	autoMetricsActions,
	autoMetricsOp,
	autoMetricsOps,
	toMiddleware,
	toMiddlewares,
} from '../index';

describe('n-auto-metrics exports', () => {
	it('initAutoMetrics', () => {
		expect(typeof initAutoMetrics).toBe('function');
	});

	it('getMetricsInstance', () => {
		expect(typeof getMetricsInstance).toBe('function');
	});

	it('autoMetricsAction', () => {
		expect(typeof autoMetricsAction).toBe('function');
	});

	it('autoMetricsActions', () => {
		expect(typeof autoMetricsActions).toBe('function');
	});

	it('autoMetricsOp', () => {
		expect(typeof autoMetricsOp).toBe('function');
	});

	it('autoMetricsOps', () => {
		expect(typeof autoMetricsOps).toBe('function');
	});

	it('toMiddleware', () => {
		expect(typeof toMiddleware).toBe('function');
	});

	it('toMiddlewares', () => {
		expect(typeof toMiddlewares).toBe('function');
	});
});
