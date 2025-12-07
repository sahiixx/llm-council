import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Stage1 from './Stage1';

describe('Stage1', () => {
  const mockResponses = [
    { model: 'openai/gpt-4', response: 'Response from GPT-4' },
    { model: 'anthropic/claude-3', response: 'Response from Claude' },
    { model: 'google/gemini-pro', response: 'Response from Gemini' },
  ];

  describe('Rendering', () => {
    it('should render stage title', () => {
      render(<Stage1 responses={mockResponses} />);
      expect(screen.getByText(/Stage 1/i)).toBeInTheDocument();
    });

    it('should render all model responses', () => {
      render(<Stage1 responses={mockResponses} />);
      
      expect(screen.getByText('Response from GPT-4')).toBeInTheDocument();
      expect(screen.getByText('Response from Claude')).toBeInTheDocument();
      expect(screen.getByText('Response from Gemini')).toBeInTheDocument();
    });

    it('should render model names', () => {
      render(<Stage1 responses={mockResponses} />);
      
      expect(screen.getByText(/gpt-4/i)).toBeInTheDocument();
      expect(screen.getByText(/claude/i)).toBeInTheDocument();
      expect(screen.getByText(/gemini/i)).toBeInTheDocument();
    });

    it('should render empty state with no responses', () => {
      render(<Stage1 responses={[]} />);
      
      expect(screen.getByText(/Stage 1/i)).toBeInTheDocument();
    });

    it('should render single response', () => {
      const singleResponse = [mockResponses[0]];
      render(<Stage1 responses={singleResponse} />);
      
      expect(screen.getByText('Response from GPT-4')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty response content', () => {
      const responses = [{ model: 'test-model', response: '' }];
      render(<Stage1 responses={responses} />);
      
      expect(screen.getByText(/test-model/i)).toBeInTheDocument();
    });

    it('should handle very long responses', () => {
      const longResponse = 'A'.repeat(10000);
      const responses = [{ model: 'test-model', response: longResponse }];
      
      render(<Stage1 responses={responses} />);
      expect(screen.getByText(longResponse)).toBeInTheDocument();
    });

    it('should handle special characters in responses', () => {
      const specialResponse = '<script>alert("xss")</script> & "quotes"';
      const responses = [{ model: 'test-model', response: specialResponse }];
      
      render(<Stage1 responses={responses} />);
      expect(screen.getByText(specialResponse)).toBeInTheDocument();
    });

    it('should handle unicode in responses', () => {
      const unicodeResponse = 'Test 你好 café 🎉';
      const responses = [{ model: 'test-model', response: unicodeResponse }];
      
      render(<Stage1 responses={responses} />);
      expect(screen.getByText(unicodeResponse)).toBeInTheDocument();
    });

    it('should handle multiline responses', () => {
      const multilineResponse = 'Line 1\nLine 2\nLine 3';
      const responses = [{ model: 'test-model', response: multilineResponse }];
      
      render(<Stage1 responses={responses} />);
      expect(screen.getByText(/Line 1/)).toBeInTheDocument();
    });

    it('should handle markdown-like content', () => {
      const markdownResponse = '# Heading\n**bold** *italic*\n- item1\n- item2';
      const responses = [{ model: 'test-model', response: markdownResponse }];
      
      render(<Stage1 responses={responses} />);
      expect(screen.getByText(/Heading/)).toBeInTheDocument();
    });

    it('should handle code blocks in responses', () => {
      const codeResponse = '```python\nprint("hello")\n```';
      const responses = [{ model: 'test-model', response: codeResponse }];
      
      render(<Stage1 responses={responses} />);
      expect(screen.getByText(/print/)).toBeInTheDocument();
    });
  });

  describe('Props Validation', () => {
    it('should not crash with undefined responses', () => {
      expect(() => {
        render(<Stage1 responses={undefined} />);
      }).not.toThrow();
    });

    it('should not crash with null responses', () => {
      expect(() => {
        render(<Stage1 responses={null} />);
      }).not.toThrow();
    });
  });
});