import { getMetricsInstance } from './init';

export const autoMetricsOp = operationFunction => {
	const enhancedFunction = async (meta, req, res) => {
		const metrics = getMetricsInstance();
		if (metrics === undefined) {
			throw Error('auto metrics instance needs to be initialised');
		}
		const operation = operationFunction.name;
		const { segment } = {
			...(req && req.meta ? req.meta : {}),
			...(req && req.metrics ? req.metrics : {}),
		};
		const operationRoot = `operation.${operation}.segment.${segment}`;
		metrics.count(`${operationRoot}.state.start`, 1);

		const m = {
			operation,
			...meta,
			...(req && req.meta ? req.meta : {}),
		};

		try {
			await operationFunction(m, req, res);
			metrics.count(`${operationRoot}.state.success`, 1);
		} catch (e) {
			metrics.count(
				`${operationRoot}.state.failure.category.${e.category}.type.${e.type}`,
				1,
			);
			throw e;
		}
	};
	Object.defineProperty(enhancedFunction, 'name', {
		value: operationFunction.name,
		configurable: true,
	});
	return enhancedFunction;
};

export const toMiddleware = operationFunction => {
	const convertedFunction = async (req, res, next) => {
		try {
			await operationFunction({}, req, res);
			if (!res.headersSent) {
				next();
			}
		} catch (e) {
			if (!res.headersSent) {
				next(e);
			}
		}
	};
	Object.defineProperty(convertedFunction, 'name', {
		value: operationFunction.name,
		configurable: true,
	});
	return convertedFunction;
};

export const autoMetricsOps = operationBundle => {
	const enhanced = {};
	Object.keys(operationBundle).forEach(methodName => {
		const enhancedMethod = autoMetricsOp(operationBundle[methodName]);
		Object.defineProperty(operationBundle[methodName], 'name', {
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

export const toMiddlewares = operationBundle => {
	const converted = {};
	Object.keys(operationBundle).forEach(methodName => {
		const convertedMethod = toMiddleware(operationBundle[methodName]);
		Object.defineProperty(operationBundle[methodName], 'name', {
			value: methodName,
			configurable: true,
		});
		Object.defineProperty(convertedMethod, 'name', {
			value: methodName,
			configurable: true,
		});
		converted[methodName] = convertedMethod;
	});
	return converted;
};
