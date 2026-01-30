import { describe, it, expect } from 'vitest';
import {
  sanitizeHtml,
  sanitizeText,
  sanitizeUrl,
  sanitizeRichText,
  sanitizeObject,
} from './sanitize';

describe('sanitize', () => {
  describe('sanitizeHtml', () => {
    it('should allow safe HTML tags', () => {
      const input = '<p>Hello <strong>World</strong></p>';
      const result = sanitizeHtml(input);
      expect(result).toContain('Hello');
      expect(result).toContain('strong');
    });

    it('should remove script tags', () => {
      const input = '<p>Hello</p><script>alert("XSS")</script>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('script');
      expect(result).not.toContain('alert');
    });

    it('should remove event handlers', () => {
      const input = '<a href="#" onclick="alert(\'XSS\')">Click me</a>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('onclick');
      expect(result).toContain('Click me');
    });
  });

  describe('sanitizeText', () => {
    it('should strip all HTML tags', () => {
      const input = '<p>Hello <strong>World</strong></p>';
      const result = sanitizeText(input);
      expect(result).toBe('Hello World');
    });

    it('should handle script injection attempts', () => {
      const input = 'Hello<script>alert("XSS")</script>World';
      const result = sanitizeText(input);
      expect(result).toBe('HelloWorld');
    });
  });

  describe('sanitizeUrl', () => {
    it('should allow safe HTTP URLs', () => {
      const input = 'https://example.com';
      const result = sanitizeUrl(input);
      expect(result).toBe('https://example.com');
    });

    it('should block javascript: URLs', () => {
      const input = 'javascript:alert("XSS")';
      const result = sanitizeUrl(input);
      expect(result).toBe('');
    });

    it('should block data: URLs', () => {
      const input = 'data:text/html,<script>alert("XSS")</script>';
      const result = sanitizeUrl(input);
      expect(result).toBe('');
    });

    it('should block vbscript: URLs', () => {
      const input = 'vbscript:msgbox("XSS")';
      const result = sanitizeUrl(input);
      expect(result).toBe('');
    });
  });

  describe('sanitizeRichText', () => {
    it('should allow rich text formatting', () => {
      const input = '<h1>Title</h1><p>Paragraph with <strong>bold</strong></p>';
      const result = sanitizeRichText(input);
      expect(result).toContain('h1');
      expect(result).toContain('strong');
    });

    it('should remove dangerous tags from rich text', () => {
      const input = '<h1>Title</h1><script>alert("XSS")</script>';
      const result = sanitizeRichText(input);
      expect(result).not.toContain('script');
    });
  });

  describe('sanitizeObject', () => {
    it('should sanitize string properties', () => {
      const input = {
        name: 'John<script>alert("XSS")</script>',
        email: 'john@example.com',
      };
      const result = sanitizeObject(input);
      expect(result.name).toBe('John');
      expect(result.email).toBe('john@example.com');
    });

    it('should handle nested objects', () => {
      const input = {
        user: {
          name: '<strong>John</strong>',
          bio: '<p>Developer</p>',
        },
      };
      const result = sanitizeObject(input);
      expect(result.user.name).toBe('John');
      expect(result.user.bio).toBe('Developer');
    });

    it('should handle arrays', () => {
      const input = {
        tags: ['<script>alert</script>', 'safe', '<b>bold</b>'],
      };
      const result = sanitizeObject(input);
      expect(result.tags[0]).toBe('');
      expect(result.tags[1]).toBe('safe');
      expect(result.tags[2]).toBe('bold');
    });

    it('should preserve non-string values', () => {
      const input = {
        name: 'John',
        age: 30,
        active: true,
        score: null,
      };
      const result = sanitizeObject(input);
      expect(result.age).toBe(30);
      expect(result.active).toBe(true);
      expect(result.score).toBe(null);
    });
  });
});
