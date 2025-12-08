import { shuffleArray } from '../../src/services/dataService';

describe('Unit: Algorithm Logic (shuffleArray)', () => {

    it('should preserve all elements after shuffling', () => {
        const input = [1, 2, 3, 4, 5];
        const output = shuffleArray(input);

        expect(output).toHaveLength(input.length);
        expect(output.sort()).toEqual(input.sort()); 
    });

    it('should NOT return the same instance (Immutability)', () => {
        const input = [1, 2, 3];
        const output = shuffleArray(input);
        
        expect(output).not.toBe(input); 
    });

    it('should handle empty arrays without crashing', () => {
        const input: number[] = [];
        const output = shuffleArray(input);
        expect(output).toEqual([]);
    });

    it('should handle single-element arrays', () => {
        const input = [42];
        const output = shuffleArray(input);
        expect(output).toEqual([42]);
    });

    it('should handle arrays with duplicate values', () => {
        const input = ['A', 'B', 'A', 'C'];
        const output = shuffleArray(input);
        expect(output.sort()).toEqual(['A', 'A', 'B', 'C']);
    });
});