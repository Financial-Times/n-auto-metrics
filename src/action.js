import { metricsEvent } from './event';
import { isPromise } from './utils';

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
		Object.defineProperty(actionBundle[methodName], 'name', {
			value: methodName,
			configurable: true,
		});
		Object.defineProperty(enhancedMethod, 'name', {
			value: methodName,
			configurable: true,
		});
		enhanced[methodName] = enhancedMethod;
	});
	return enhanced;
};
