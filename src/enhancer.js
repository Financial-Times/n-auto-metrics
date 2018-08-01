import {
	createEnhancer,
	actionOperationAdaptor,
} from '@financial-times/n-express-enhancer';

import metricsAction from './action';
import metricsOperation from './operation';

const autoMetrics = createEnhancer(
	actionOperationAdaptor({
		actionEnhancer: metricsAction,
		operationEnhancer: metricsOperation,
	}),
);

export default autoMetrics;
