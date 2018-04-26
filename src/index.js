export {
	toMiddleware,
	enhancedRender,
} from '@financial-times/n-express-enhancer';

export { initAutoMetrics, getMetricsInstance } from './init';
export { autoMetricsAction, autoMetricsActions } from './action';
export { default as metricsOperation } from './operation';
