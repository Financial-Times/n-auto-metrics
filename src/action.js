import { getMetricsInstance } from './init';
import { isPromise } from './utils';

const createEventMetrics = ({ namespace, operation, action }) => {
	const metrics = getMetricsInstance();
	if (metrics === undefined) {
		throw Error(`auto metrics instance needs to be initialised first`);
	}
	const serviceRoot = `service.${namespace}.${action}`;
	const operationRoot = `operation.${operation}.action.${action}`;
	const countOne = path => {
		metrics.count(`${serviceRoot}.${path}`, 1);
		metrics.count(`${operationRoot}.${path}`, 1);
	};
	return {
		start: () => countOne('start'),
		success: () => countOne('success'),
		failure: e => {
			countOne(`failure.status.${e.status}`);
			countOne(`failure.type.${e.type}`);
		},
	};
};

const metricsEvent = ({ namespace, operation, action }) => {
	const event = createEventMetrics({ namespace, operation, action });
	event.start();
	return event;
};

export const autoMetricsAction = callFunction => (
	paramsOrArgs = {},
	meta = {},
) => {
	const namespace = meta.namespace || paramsOrArgs.namespace || 'action';
	const action = callFunction.name;
	if (typeof namespace !== 'string' || namespace.includes(' ')) {
		throw Error(
			`action metrics namespace needs to be string without spaces, at function ${action}`,
		);
	}
	const operation = meta.operation || paramsOrArgs.operation;

	const event = metricsEvent({ namespace, operation, action });

	try {
		const call = callFunction(paramsOrArgs, meta);
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

export const autoMetricsActions = serviceName => actionBundle => {
	if (typeof serviceName !== 'string' || serviceName.includes(' ')) {
		throw Error(`service name for metrics needs to be string without spaces`);
	}
	const enhanced = {};
	Object.keys(actionBundle).forEach(methodName => {
		enhanced[methodName] = (paramsOrArgs, meta) =>
			autoMetricsAction(actionBundle[methodName])(paramsOrArgs, {
				...meta,
				namespace: serviceName,
			});
	});
	return enhanced;
};
