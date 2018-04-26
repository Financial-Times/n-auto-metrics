import {
	initAutoMetrics,
	getMetricsInstance,
	autoMetricsAction,
	autoMetricsActions,
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

	it('autoMetricsAction', () => {
		expect(typeof autoMetricsAction).toBe('function');
	});

	it('autoMetricsActions', () => {
		expect(typeof autoMetricsActions).toBe('function');
	});

	it('metricsOperation', () => {
		expect(typeof metricsOperation).toBe('function');
	});

	it('toMiddleware', () => {
		expect(typeof toMiddleware).toBe('function');
	});
});
