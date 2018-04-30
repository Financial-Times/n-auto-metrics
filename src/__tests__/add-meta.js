import addMeta from '../add-meta';

describe('addMeta', () => {
	it('create enhancer that add meta to action function', () => {
		const actionFunction = (params, meta) => meta;
		const addingMeta = { service: 'some-service' };
		const enhanced = addMeta(addingMeta)(actionFunction);
		const result = enhanced({}, {});
		expect(result).toEqual(addingMeta);
	});

	it('create enhancer that can add meta to action function bundle', async () => {
		const actionFunctionBundle = {
			methodA: (params, meta) => meta,
			methodB: async args => args,
		};
		const addingMeta = { service: 'some-service' };
		const enhanced = addMeta(addingMeta)(actionFunctionBundle);
		const resultA = enhanced.methodA({}, {});
		const resultB = await enhanced.methodB({});
		expect(resultA).toEqual(addingMeta);
		expect(resultB).toEqual(addingMeta);
	});

	// it('throws error if created enhancer used on operation function', () => {
	// 	const actionFunction = (params, meta) => meta;
	// 	const operationFunction = meta => meta;
	// 	const addingMeta = { service: 'some-service' };
	// 	const enhanced = addMeta(addingMeta)({
	// 		actionFunction,
	// 		operationFunction,
	// 	});
	// });

	it('throws error if input of addMeta is not an object, e.g. in case the meta is forgotten', () => {
		const operationFunction = () => {};
		expect(() => addMeta('')).toThrowErrorMatchingSnapshot();
		expect(() => addMeta(operationFunction)).toThrowErrorMatchingSnapshot();
	});
});
