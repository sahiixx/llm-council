import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Stage3 from './Stage3';

describe('Stage3', () => {
  const mockFinalResponse = {
    model: 'openai/gpt-4-turbo',
    response: 'This is the final synthesized answer from the chairman model.',
  };

  describe('Rendering', () => {
    it('should render stage title', () => {
      render(<Stage3 finalResponse={mockFinalResponse} />);
      expect(screen.getByText(/Stage 3/i)).toBeInTheDocument();
    });

    it('should render final response content', () => {
      render(<Stage3 finalResponse={mockFinalResponse} />);
      expect(screen.getByText(/final synthesized answer/i)).toBeInTheDocument();
    });

    it('should render model name', () => {
      render(<Stage3 finalResponse={mockFinalResponse} />);
      expect(screen.getByText(/gpt-4-turbo/i)).toBeInTheDocument();
    });

    it('should render with empty response', () => {
      const emptyResponse = { model: 'test-model', response: '' };
      render(<Stage3 finalResponse={emptyResponse} />);
      
      expect(screen.getByText(/Stage 3/i)).toBeInTheDocument();
      expect(screen.getByText(/test-model/i)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long response', () => {
      const longResponse = { model: 'test', response: 'A'.repeat(10000) };
      render(<Stage3 finalResponse={longResponse} />);
      
      expect(screen.getByText(/A{100,}/)).toBeInTheDocument();
    });

    it('should handle special characters', () => {
      const specialResponse = {
        model: 'test',
        response: '<script>alert("xss")</script> & "quotes"',
      };
      render(<Stage3 finalResponse={specialResponse} />);
      
      expect(screen.getByText(/script/)).toBeInTheDocument();
    });

    it('should handle unicode characters', () => {
      const unicodeResponse = { model: 'test', response: 'Test 你好 café 🎉' };
      render(<Stage3 finalResponse={unicodeResponse} />);
      
      expect(screen.getByText(/你好/)).toBeInTheDocument();
    });

    it('should handle multiline response', () => {
      const multilineResponse = {
        model: 'test',
        response: 'Line 1\nLine 2\nLine 3',
      };
      render(<Stage3 finalResponse={multilineResponse} />);
      
      expect(screen.getByText(/Line 1/)).toBeInTheDocument();
    });

    it('should handle markdown content', () => {
      const markdownResponse = {
        model: 'test',
        response: '# Heading\n**bold** *italic*',
      };
      render(<Stage3 finalResponse={markdownResponse} />);
      
      expect(screen.getByText(/Heading/)).toBeInTheDocument();
    });

    it('should handle code blocks', () => {
      const codeResponse = {
        model: 'test',
        response: '```python\nprint("hello")\n```',
      };
      render(<Stage3 finalResponse={codeResponse} />);
      
      expect(screen.getByText(/print/)).toBeInTheDocument();
    });
  });

  describe('Props Validation', () => {
    it('should not crash with undefined finalResponse', () => {
      expect(() => {
        render(<Stage3 finalResponse={undefined} />);
      }).not.toThrow();
    });

    it('should not crash with null finalResponse', () => {
      expect(() => {
        render(<Stage3 finalResponse={null} />);
      }).not.toThrow();
    });

    it('should handle missing model field', () => {
      const responseWithoutModel = { response: 'Test response' };
      expect(() => {
        render(<Stage3 finalResponse={responseWithoutModel} />);
      }).not.toThrow();
    });

    it('should handle missing response field', () => {
      const responseWithoutContent = { model: 'test-model' };
      expect(() => {
        render(<Stage3 finalResponse={responseWithoutContent} />);
      }).not.toThrow();
    });
  });
});