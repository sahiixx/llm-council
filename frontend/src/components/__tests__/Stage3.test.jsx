/**
 * Comprehensive unit tests for Stage3.jsx
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Stage3 from '../Stage3';

describe('Stage3 Component', () => {
  const mockFinalResponse = {
    model: 'google/gemini-2-pro',
    response: 'This is the final synthesized answer from the chairman.',
  };

  describe('Rendering', () => {
    it('should render stage title', () => {
      render(<Stage3 finalResponse={mockFinalResponse} />);
      expect(screen.getByText(/stage 3.*final council answer/i)).toBeInTheDocument();
    });

    it('should render chairman label', () => {
      render(<Stage3 finalResponse={mockFinalResponse} />);
      expect(screen.getByText(/chairman:/i)).toBeInTheDocument();
    });

    it('should show short model name', () => {
      render(<Stage3 finalResponse={mockFinalResponse} />);
      expect(screen.getByText(/gemini-2-pro/i)).toBeInTheDocument();
    });

    it('should render final response text', () => {
      render(<Stage3 finalResponse={mockFinalResponse} />);
      expect(screen.getByText(/final synthesized answer/i)).toBeInTheDocument();
    });

    it('should return null when no final response', () => {
      const { container } = render(<Stage3 finalResponse={null} />);
      expect(container.firstChild).toBeNull();
    });

    it('should return null for undefined final response', () => {
      const { container } = render(<Stage3 />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Model Name Parsing', () => {
    it('should extract model name from provider/model format', () => {
      render(<Stage3 finalResponse={mockFinalResponse} />);
      expect(screen.getByText(/gemini-2-pro/)).toBeInTheDocument();
    });

    it('should handle model without provider prefix', () => {
      const response = { model: 'simple-model', response: 'Answer' };
      render(<Stage3 finalResponse={response} />);
      expect(screen.getByText(/simple-model/)).toBeInTheDocument();
    });

    it('should handle multiple slashes in model name', () => {
      const response = { model: 'provider/category/model', response: 'Answer' };
      render(<Stage3 finalResponse={response} />);
      expect(screen.getByText(/category\/model/)).toBeInTheDocument();
    });
  });

  describe('Content Rendering', () => {
    it('should render markdown content', () => {
      const response = {
        model: 'model1',
        response: '**Bold** and *italic* text',
      };

      expect(() => {
        render(<Stage3 finalResponse={response} />);
      }).not.toThrow();
    });

    it('should handle empty response text', () => {
      const response = { model: 'model1', response: '' };
      render(<Stage3 finalResponse={response} />);
      expect(screen.getByText(/chairman:/i)).toBeInTheDocument();
    });

    it('should handle very long responses', () => {
      const longResponse = 'A'.repeat(100000);
      const response = { model: 'model1', response: longResponse };

      expect(() => {
        render(<Stage3 finalResponse={response} />);
      }).not.toThrow();
    });

    it('should handle special characters in response', () => {
      const response = {
        model: 'model1',
        response: '<script>alert("test")</script> & < > " \'',
      };

      expect(() => {
        render(<Stage3 finalResponse={response} />);
      }).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle response with code blocks', () => {
      const response = {
        model: 'model1',
        response: '```python\nprint("Hello")\n```',
      };

      expect(() => {
        render(<Stage3 finalResponse={response} />);
      }).not.toThrow();
    });

    it('should handle response with lists', () => {
      const response = {
        model: 'model1',
        response: '1. First\n2. Second\n3. Third',
      };

      expect(() => {
        render(<Stage3 finalResponse={response} />);
      }).not.toThrow();
    });

    it('should handle response with headers', () => {
      const response = {
        model: 'model1',
        response: '# Header 1\n## Header 2\n### Header 3',
      };

      expect(() => {
        render(<Stage3 finalResponse={response} />);
      }).not.toThrow();
    });
  });
});