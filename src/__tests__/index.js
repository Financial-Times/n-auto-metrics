import {
	initAutoMetrics,
	getMetricsInstance,
	addMeta,
	metricsAction,
	metricsOperation,
	toMiddleware,
	enhancedRender,
	compose,
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

	it('enhancedRender', () => {
		expect(typeof enhancedRender).toBe('function');
	});

	it('compose', () => {
		expect(typeof compose).toBe('function');
	});
});
