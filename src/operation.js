import { getMetricsInstance } from './init';

const metricsOperation = operationFunction => async (meta, req, res) => {
	const metrics = getMetricsInstance();
	if (metrics === undefined) {
		throw Error('auto metrics instance needs to be initialised');
	}
	const operation = operationFunction.name;
	const { segment } = req && req.meta ? req.meta : {};
	const operationRoot = `operation.${operation}.segment.${segment}`;
	metrics.count(`${operationRoot}.state.start`, 1);

	const m = {
		operation,
		...meta,
		...(req && req.meta ? req.meta : {}),
	};

	try {
		await operationFunction(m, req, res);
		metrics.count(`${operationRoot}.state.success`, 1);
	} catch (e) {
		metrics.count(
			`${operationRoot}.state.failure.category.${e.category}.type.${e.type}`,
			1,
		);
		throw e;
	}
};

export default metricsOperation;
