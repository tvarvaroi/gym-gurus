import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('utils', () => {
  describe('cn', () => {
    it('should merge class names correctly', () => {
      const result = cn('px-2', 'py-1');
      expect(result).toBe('px-2 py-1');
    });

    it('should handle conditional classes', () => {
      const result = cn('base-class', false && 'hidden', 'visible');
      expect(result).toBe('base-class visible');
    });

    it('should merge tailwind classes correctly', () => {
      const result = cn('px-2 py-1', 'px-4');
      expect(result).toBe('py-1 px-4');
    });

    it('should handle empty inputs', () => {
      const result = cn();
      expect(result).toBe('');
    });

    it('should handle arrays and objects', () => {
      const result = cn(['class1', 'class2'], { class3: true, class4: false });
      expect(result).toBe('class1 class2 class3');
    });
  });
});
