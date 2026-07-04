import { test, expect, describe, beforeEach, afterEach, jest } from '@jest/globals';

import { add } from '../src/adder.js';

describe('adder', () => {
    test('should add two numbers together', () => {
        expect(add(1, 2)).toBe(3);
    });
});