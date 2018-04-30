import { createEnhancer } from '@financial-times/n-express-enhancer';

import { isPromise } from './utils';

const addMeta = addedMeta => actionFunction => (paramsOrArgs = {}, meta) => {
	const call = meta
		? actionFunction(paramsOrArgs, { ...meta, ...addedMeta })
		: actionFunction({ ...paramsOrArgs, ...addedMeta });
	if (isPromise(call)) {
		return call.then(data => data).catch(e => {
			throw e;
		});
	}
	const data = call;
	return data;
};

export default meta => {
	if (typeof meta !== 'object') {
		throw Error('input of addMeta needs to be an object');
	}

	return createEnhancer(addMeta(meta));
};
