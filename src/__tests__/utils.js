import { isPromise } from '../utils';

describe('isPromise', () => {
	describe('return true if the input value', () => {
		it('is a Promise', () => {
			const a = Promise.resolve('test');
			const result = isPromise(a);
			expect(result).toBe(true);
		});

		it('returns a Promise', async () => {
			const a = jest.fn(() => Promise.resolve('test'));
			const call = a();
			const result = isPromise(call);
			expect(result).toBe(true);
			expect(call).not.toBe('test');
			expect(await call).toBe('test');
			expect(a.mock.calls).toHaveLength(1);
		});

		it('is an async function', async () => {
			const a = jest.fn(async () => 'test');
			const call = a();
			const result = isPromise(call);
			expect(result).toBe(true);
			expect(call).not.toBe('test');
			expect(await call).toBe('test');
			expect(a.mock.calls).toHaveLength(1);
		});
	});

	describe('return false if the input value', () => {
		it('is a sync function', () => {
			const a = jest.fn(() => 'test');
			const call = a();
			const result = isPromise(call);
			expect(result).toBe(false);
			expect(call).toBe('test');
		});
	});
});
