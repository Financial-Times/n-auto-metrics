import { createEnhancer, isPromise } from '@financial-times/n-express-enhancer';

import { metricsEvent } from './event';

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

	const event = metricsEvent({ service, operation, action });

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
