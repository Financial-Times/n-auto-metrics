import {
	initAutoMetrics,
	getMetricsInstance,
	tagService,
	metricsAction,
	metricsOperation,
	errorToHandler,
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

	it('tagService', () => {
		expect(typeof tagService).toBe('function');
	});

	it('metricsAction', () => {
		expect(typeof metricsAction).toBe('function');
	});

	it('metricsOperation', () => {
		expect(typeof metricsOperation).toBe('function');
	});

	it('errorToHandler', () => {
		expect(typeof errorToHandler).toBe('function');
	});

	it('enhancedRender', () => {
		expect(typeof enhancedRender).toBe('function');
	});

	it('compose', () => {
		expect(typeof compose).toBe('function');
	});
});
