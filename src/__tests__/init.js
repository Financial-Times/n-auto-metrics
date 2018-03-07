import { initAutoMetrics, getMetricsInstance } from '../init';

describe('initAutoMetrics', () => {
	it('would store the metrics instance that can be got', () => {
		const instance = { foo: 'bar' };
		initAutoMetrics(instance);
		const metrics = getMetricsInstance();
		expect(metrics).toBe(instance);
	});
});

describe('getMetricsInstance', () => {
	it('should repeatedly get the stored instance after init', () => {
		const instance = { foo: 'bar' };
		initAutoMetrics(instance);
		expect(getMetricsInstance()).toBe(instance);
		expect(getMetricsInstance()).toBe(instance);
	});
});
