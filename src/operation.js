import { createEnhancer } from '@financial-times/n-express-enhancer';

import { getMetricsInstance } from './init';

const createOperationMetrics = ({ operation, segment }) => {
	const metrics = getMetricsInstance();
	if (metrics === undefined) {
		throw Error('auto metrics instance needs to be initialised');
	}
	const operationRoot = `operation.${operation}.segment.${segment}`;
	return {
		start: () => metrics.count(`${operationRoot}.state.start`, 1),
		success: () => metrics.count(`${operationRoot}.state.success`, 1),
		failure: e =>
			metrics.count(
				`${operationRoot}.state.failure.category.${e.category}.type.${e.type}`,
				1,
			),
	};
};

const metricsOperation = operationFunction => async (req = {}, res = {}) => {
	const operation = operationFunction.name;
	const { segment } = req.meta || {};
	const operatoinMetrics = createOperationMetrics({ operation, segment });
	operatoinMetrics.start();

	try {
		req.meta = {
			...req.meta,
			operation,
		};
		await operationFunction(req, res);
		operatoinMetrics.success();
	} catch (e) {
		operatoinMetrics.failure(e);
		throw e;
	}
};

export default createEnhancer(metricsOperation);
