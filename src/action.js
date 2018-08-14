import { createEnhancer, isPromise } from '@financial-times/n-express-enhancer';

import { getMetricsInstance } from './init';

const createEventMetrics = ({ service, operation, action }) => {
	const metrics = getMetricsInstance();
	if (metrics === undefined) {
		throw Error(`auto metrics instance needs to be initialised first`);
	}
	const serviceRoot = `service.${service}.action.${action}`;
	const operationRoot = `operation.${operation}.action.${action}`;
	const countOne = path => {
		metrics.count(`${serviceRoot}.${path}`, 1);
		metrics.count(`${operationRoot}.${path}`, 1);
	};
	return {
		start: () => countOne('state.start'),
		success: () => countOne('state.success'),
		failure: e => {
			countOne(`state.failure.category.${e.category}.status.${e.status}`);
			countOne(`state.failure.category.${e.category}.type.${e.type}`);
		},
	};
};

const metricsAction = actionFunction => (paramsOrArgs = {}, meta) => {
	const m = { ...meta, ...paramsOrArgs.meta };
	const service = m.service || paramsOrArgs.service || 'undefined';
	const action = actionFunction.name;
	if (typeof service !== 'string' || service.includes(' ')) {
		throw Error(
			`action metrics service name needs to be string without spaces, at function ${action}`,
		);
	}
	const operation = m.operation || paramsOrArgs.operation;

	const event = createEventMetrics({ service, operation, action });
	event.start();

	try {
		const call = meta
			? actionFunction(paramsOrArgs, meta)
			: actionFunction(paramsOrArgs);

		if (isPromise(call)) {
			return call
				.then(data => {
					event.success();
					return data;
				})
				.catch(e => {
					event.failure(e);
					throw e;
				});
		}

		const data = call;
		event.success();
		return data;
	} catch (e) {
		event.failure(e);
		throw e;
	}
};

export default createEnhancer(metricsAction);
