import { getMetricsInstance } from './init';
import { isPromise } from './utils';

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

const metricsEvent = ({ service, operation, action }) => {
	const event = createEventMetrics({ service, operation, action });
	event.start();
	return event;
};

export const autoMetricsAction = callFunction => {
	const enhancedFunction = (paramsOrArgs = {}, meta = {}) => {
		const service = meta.service || paramsOrArgs.service || 'undefined';
		const action = callFunction.name;
		if (typeof service !== 'string' || service.includes(' ')) {
			throw Error(
				`action metrics service name needs to be string without spaces, at function ${action}`,
			);
		}
		const operation = meta.operation || paramsOrArgs.operation;

		const event = metricsEvent({ service, operation, action });

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
	Object.defineProperty(enhancedFunction, 'name', {
		value: callFunction.name,
		configurable: true,
	});
	return enhancedFunction;
};

export const autoMetricsActions = service => actionBundle => {
	if (typeof service !== 'string' || service.includes(' ')) {
		throw Error(`service name for metrics needs to be string without spaces`);
	}
	const enhanced = {};
	Object.keys(actionBundle).forEach(methodName => {
		const enhancedMethod = (paramsOrArgs, meta) =>
			autoMetricsAction(actionBundle[methodName])(paramsOrArgs, {
				...meta,
				service,
			});
		Object.defineProperty(enhancedMethod, 'name', {
			value: methodName,
			configurable: true,
		});
		enhanced[methodName] = enhancedMethod;
	});
	return enhanced;
};
