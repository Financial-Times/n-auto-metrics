let metrics;

export const initAutoMetrics = instance => {
	metrics = instance;
};

export const getMetricsInstance = () => metrics;
