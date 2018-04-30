import {
	initAutoMetrics,
	getMetricsInstance,
	addMeta,
	metricsAction,
	metricsOperation,
	toMiddleware,
} from '../index';

describe('n-auto-metrics exports', () => {
	it('initAutoMetrics', () => {
		expect(typeof initAutoMetrics).toBe('function');
	});

	it('getMetricsInstance', () => {
		expect(typeof getMetricsInstance).toBe('function');
	});

	it('addMeta', () => {
		expect(typeof addMeta).toBe('function');
	});

	it('metricsAction', () => {
		expect(typeof metricsAction).toBe('function');
	});

	it('metricsOperation', () => {
		expect(typeof metricsOperation).toBe('function');
	});

	it('toMiddleware', () => {
		expect(typeof toMiddleware).toBe('function');
	});
});
