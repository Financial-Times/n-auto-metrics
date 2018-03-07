import { getMetricsInstance } from './init';

export const autoMetricsOp = operationFunction => async (req, res, next) => {
	const metrics = getMetricsInstance();
	if (metrics === undefined) {
		throw Error('auto metrics instance needs to be initialised');
	}
	const operation = operationFunction.name;
	const meta = {
		operation,
		...(req && req.meta ? req.meta : {}),
		...(req && req.metrics ? req.metrics : {}),
	};
	const { segment } = meta;
	metrics.count(`operation.${operation}.segment.${segment}.start`, 1);

	try {
		await operationFunction(meta, req, res, next);
		metrics.count(`operation.${operation}.segment.${segment}.success`, 1);
	} catch (e) {
		metrics.count(
			`operation.${operation}.segment.${segment}.failure.${e.type}`,
			1,
		);
	}
};

export const autoMetricsOps = operationBundle => {
	const enhanced = {};
	Object.keys(operationBundle).forEach(methodName => {
		enhanced[methodName] = autoMetricsOp(operationBundle[methodName]);
	});
	return enhanced;
};
