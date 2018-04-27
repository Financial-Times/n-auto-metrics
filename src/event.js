import { getMetricsInstance } from './init';

export const createEventMetrics = ({ service, operation, action }) => {
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

export const metricsEvent = ({ service, operation, action }) => {
	const event = createEventMetrics({ service, operation, action });
	event.start();
	return event;
};
