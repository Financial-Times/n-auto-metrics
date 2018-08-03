import { createAdaptableEnhancer } from '@financial-times/n-express-enhancer';

import metricsAction from './action';
import metricsOperation from './operation';

const autoMetrics = createAdaptableEnhancer({
	actionEnhancement: metricsAction,
	operationEnhancement: metricsOperation,
});

export default autoMetrics;
