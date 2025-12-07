/**
 * Comprehensive unit tests for frontend/src/components/Stage3.jsx
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Stage3 from './Stage3';

describe('Stage3 Component', () => {
  const mockFinalResponse = {
    model: 'openai/gpt-4',
    response: 'This is the final synthesized answer from the council.'
  };

  describe('Rendering', () => {
    it('should render stage title', () => {
      render(<Stage3 finalResponse={mockFinalResponse} />);
      expect(screen.getByText('Stage 3: Final Council Answer')).toBeInTheDocument();
    });

    it('should display chairman label with model name', () => {
      render(<Stage3 finalResponse={mockFinalResponse} />);
      expect(screen.getByText(/Chairman:/)).toBeInTheDocument();
      expect(screen.getByText(/gpt-4/)).toBeInTheDocument();
    });

    it('should display final response text', () => {
      render(<Stage3 finalResponse={mockFinalResponse} />);
      expect(screen.getByText('This is the final synthesized answer from the council.')).toBeInTheDocument();
    });

    it('should not render when finalResponse is null', () => {
      const { container } = render(<Stage3 finalResponse={null} />);
      expect(container.firstChild).toBeNull();
    });

    it('should not render when finalResponse is undefined', () => {
      const { container } = render(<Stage3 finalResponse={undefined} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Model Name Display', () => {
    it('should display short model name (after slash)', () => {
      render(<Stage3 finalResponse={mockFinalResponse} />);
      
      const chairmanLabel = screen.getByText(/Chairman:/);
      expect(chairmanLabel.textContent).toContain('gpt-4');
      expect(chairmanLabel.textContent).not.toContain('openai/');
    });

    it('should handle model names without slash', () => {
      const noSlashResponse = {
        model: 'custom-chairman',
        response: 'Final answer'
      };
      
      render(<Stage3 finalResponse={noSlashResponse} />);
      
      expect(screen.getByText(/custom-chairman/)).toBeInTheDocument();
    });

    it('should handle empty model name', () => {
      const emptyModelResponse = {
        model: '',
        response: 'Final answer'
      };
      
      render(<Stage3 finalResponse={emptyModelResponse} />);
      
      expect(screen.getByText('Chairman:')).toBeInTheDocument();
    });

    it('should handle null model name', () => {
      const nullModelResponse = {
        model: null,
        response: 'Final answer'
      };
      
      const { container } = render(<Stage3 finalResponse={nullModelResponse} />);
      
      // Should not crash
      expect(container.querySelector('.stage3')).toBeInTheDocument();
    });
  });

  describe('Response Content', () => {
    it('should render markdown in response', () => {
      const markdownResponse = {
        model: 'test/model',
        response: '# Heading\n\n**Bold text** and *italic*'
      };
      
      render(<Stage3 finalResponse={markdownResponse} />);
      
      expect(screen.getByText(/Heading/)).toBeInTheDocument();
    });

    it('should handle very long responses', () => {
      const longText = 'A'.repeat(10000);
      const longResponse = {
        model: 'test/model',
        response: longText
      };
      
      render(<Stage3 finalResponse={longResponse} />);
      
      expect(screen.getByText(longText)).toBeInTheDocument();
    });

    it('should handle empty response text', () => {
      const emptyResponse = {
        model: 'test/model',
        response: ''
      };
      
      render(<Stage3 finalResponse={emptyResponse} />);
      
      expect(screen.getByText(/Chairman:/)).toBeInTheDocument();
    });

    it('should handle multiline responses', () => {
      const multilineResponse = {
        model: 'test/model',
        response: 'Line 1\nLine 2\nLine 3'
      };
      
      render(<Stage3 finalResponse={multilineResponse} />);
      
      expect(screen.getByText(/Line 1/)).toBeInTheDocument();
    });

    it('should handle responses with special characters', () => {
      const specialResponse = {
        model: 'test/model',
        response: 'Test <>&"\' 你好 🌍'
      };
      
      render(<Stage3 finalResponse={specialResponse} />);
      
      expect(screen.getByText('Test <>&"\' 你好 🌍')).toBeInTheDocument();
    });

    it('should handle responses with code blocks', () => {
      const codeResponse = {
        model: 'test/model',
        response: '```python\nprint("Hello")\n```'
      };
      
      render(<Stage3 finalResponse={codeResponse} />);
      
      // ReactMarkdown should render code blocks
      expect(screen.getByText(/print/)).toBeInTheDocument();
    });

    it('should handle responses with lists', () => {
      const listResponse = {
        model: 'test/model',
        response: '1. First item\n2. Second item\n3. Third item'
      };
      
      render(<Stage3 finalResponse={listResponse} />);
      
      expect(screen.getByText(/First item/)).toBeInTheDocument();
      expect(screen.getByText(/Second item/)).toBeInTheDocument();
    });

    it('should handle responses with links', () => {
      const linkResponse = {
        model: 'test/model',
        response: '[Click here](https://example.com)'
      };
      
      render(<Stage3 finalResponse={linkResponse} />);
      
      const link = screen.getByRole('link', { name: /Click here/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', 'https://example.com');
    });
  });

  describe('Edge Cases', () => {
    it('should handle finalResponse with only model field', () => {
      const onlyModel = {
        model: 'test/model'
      };
      
      const { container } = render(<Stage3 finalResponse={onlyModel} />);
      
      // Should not crash
      expect(container.querySelector('.stage3')).toBeInTheDocument();
    });

    it('should handle finalResponse with only response field', () => {
      const onlyResponse = {
        response: 'Some response'
      };
      
      const { container } = render(<Stage3 finalResponse={onlyResponse} />);
      
      // Should not crash
      expect(container.querySelector('.stage3')).toBeInTheDocument();
    });

    it('should handle finalResponse as empty object', () => {
      const { container } = render(<Stage3 finalResponse={{}} />);
      
      // Should render but might have empty content
      expect(container.querySelector('.stage3')).toBeInTheDocument();
    });

    it('should handle null response text', () => {
      const nullResponse = {
        model: 'test/model',
        response: null
      };
      
      const { container } = render(<Stage3 finalResponse={nullResponse} />);
      
      // Should not crash
      expect(container.querySelector('.stage3')).toBeInTheDocument();
    });

    it('should handle response with HTML entities', () => {
      const htmlEntitiesResponse = {
        model: 'test/model',
        response: '&lt;div&gt;Test&lt;/div&gt;'
      };
      
      render(<Stage3 finalResponse={htmlEntitiesResponse} />);
      
      expect(screen.getByText(/div.*Test.*div/)).toBeInTheDocument();
    });
  });

  describe('CSS Classes', () => {
    it('should apply correct CSS classes to elements', () => {
      const { container } = render(<Stage3 finalResponse={mockFinalResponse} />);
      
      expect(container.querySelector('.stage')).toBeInTheDocument();
      expect(container.querySelector('.stage3')).toBeInTheDocument();
      expect(container.querySelector('.stage-title')).toBeInTheDocument();
      expect(container.querySelector('.final-response')).toBeInTheDocument();
      expect(container.querySelector('.chairman-label')).toBeInTheDocument();
      expect(container.querySelector('.final-text')).toBeInTheDocument();
      expect(container.querySelector('.markdown-content')).toBeInTheDocument();
    });
  });
});