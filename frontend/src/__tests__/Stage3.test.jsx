import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Stage3 from '../components/Stage3';

describe('Stage3 Component', () => {
  const mockFinalResponse = {
    model: 'google/gemini-3-pro-preview',
    response: '# Final Answer\n\nBased on the council\'s deliberations, here is the synthesized response.',
  };

  describe('Rendering', () => {
    it('renders stage title', () => {
      render(<Stage3 finalResponse={mockFinalResponse} />);
      
      expect(screen.getByText('Stage 3: Final Council Answer')).toBeInTheDocument();
    });

    it('returns null when no final response', () => {
      const { container } = render(<Stage3 finalResponse={null} />);
      
      expect(container.firstChild).toBeNull();
    });

    it('returns null when finalResponse is undefined', () => {
      const { container } = render(<Stage3 finalResponse={undefined} />);
      
      expect(container.firstChild).toBeNull();
    });

    it('displays chairman label with model name', () => {
      render(<Stage3 finalResponse={mockFinalResponse} />);
      
      expect(screen.getByText(/Chairman:/)).toBeInTheDocument();
      expect(screen.getByText(/gemini-3-pro-preview/)).toBeInTheDocument();
    });

    it('displays final response text', () => {
      render(<Stage3 finalResponse={mockFinalResponse} />);
      
      expect(screen.getByText(/Final Answer/)).toBeInTheDocument();
      expect(screen.getByText(/council's deliberations/)).toBeInTheDocument();
    });
  });

  describe('Model Name Display', () => {
    it('extracts short name from full model identifier', () => {
      render(<Stage3 finalResponse={mockFinalResponse} />);
      
      expect(screen.getByText(/gemini-3-pro-preview/)).toBeInTheDocument();
    });

    it('handles model without slash', () => {
      const responseNoSlash = {
        model: 'local-chairman',
        response: 'Final answer text',
      };
      
      render(<Stage3 finalResponse={responseNoSlash} />);
      
      expect(screen.getByText(/local-chairman/)).toBeInTheDocument();
    });

    it('handles model with multiple slashes', () => {
      const responseMultiSlash = {
        model: 'provider/category/model-name',
        response: 'Final answer',
      };
      
      render(<Stage3 finalResponse={responseMultiSlash} />);
      
      // Should show everything after first slash
      expect(screen.getByText(/category\/model-name/)).toBeInTheDocument();
    });
  });

  describe('Markdown Rendering', () => {
    it('renders markdown headings', () => {
      const responseWithHeading = {
        model: 'test/model',
        response: '# Main Heading\n\n## Subheading',
      };
      
      render(<Stage3 finalResponse={responseWithHeading} />);
      
      const heading = screen.getByText('Main Heading');
      expect(heading.tagName).toBe('H1');
    });

    it('renders markdown bold and italic', () => {
      const responseWithFormatting = {
        model: 'test/model',
        response: '**Bold text** and *italic text*',
      };
      
      render(<Stage3 finalResponse={responseWithFormatting} />);
      
      expect(screen.getByText(/Bold text/)).toBeInTheDocument();
      expect(screen.getByText(/italic text/)).toBeInTheDocument();
    });

    it('renders markdown lists', () => {
      const responseWithList = {
        model: 'test/model',
        response: '- Item 1\n- Item 2\n- Item 3',
      };
      
      render(<Stage3 finalResponse={responseWithList} />);
      
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
      expect(screen.getByText('Item 3')).toBeInTheDocument();
    });

    it('renders markdown code blocks', () => {
      const responseWithCode = {
        model: 'test/model',
        response: '```python\nprint("Hello, World!")\n```',
      };
      
      render(<Stage3 finalResponse={responseWithCode} />);
      
      expect(screen.getByText(/print/)).toBeInTheDocument();
    });

    it('renders markdown links', () => {
      const responseWithLink = {
        model: 'test/model',
        response: 'Visit [OpenAI](https://openai.com) for more info.',
      };
      
      render(<Stage3 finalResponse={responseWithLink} />);
      
      const link = screen.getByText('OpenAI');
      expect(link.tagName).toBe('A');
      expect(link).toHaveAttribute('href', 'https://openai.com');
    });
  });

  describe('Edge Cases', () => {
    it('handles empty response text', () => {
      const emptyResponse = {
        model: 'test/model',
        response: '',
      };
      
      render(<Stage3 finalResponse={emptyResponse} />);
      
      expect(screen.getByText(/Chairman:/)).toBeInTheDocument();
    });

    it('handles very long response', () => {
      const longResponse = {
        model: 'test/model',
        response: 'A'.repeat(10000),
      };
      
      render(<Stage3 finalResponse={longResponse} />);
      
      expect(screen.getByText(/Chairman:/)).toBeInTheDocument();
    });

    it('handles unicode characters', () => {
      const unicodeResponse = {
        model: 'test/model',
        response: '你好世界 🌍 café résumé',
      };
      
      render(<Stage3 finalResponse={unicodeResponse} />);
      
      expect(screen.getByText(/你好世界/)).toBeInTheDocument();
      expect(screen.getByText(/café/)).toBeInTheDocument();
    });

    it('handles special HTML characters', () => {
      const specialCharsResponse = {
        model: 'test/model',
        response: '< > & " \' characters should be escaped',
      };
      
      render(<Stage3 finalResponse={specialCharsResponse} />);
      
      expect(screen.getByText(/characters should be escaped/)).toBeInTheDocument();
    });

    it('handles multiline response', () => {
      const multilineResponse = {
        model: 'test/model',
        response: 'Line 1\n\nLine 2\n\nLine 3',
      };
      
      render(<Stage3 finalResponse={multilineResponse} />);
      
      expect(screen.getByText(/Line 1/)).toBeInTheDocument();
      expect(screen.getByText(/Line 2/)).toBeInTheDocument();
      expect(screen.getByText(/Line 3/)).toBeInTheDocument();
    });

    it('handles response with only whitespace', () => {
      const whitespaceResponse = {
        model: 'test/model',
        response: '   \n\n   ',
      };
      
      render(<Stage3 finalResponse={whitespaceResponse} />);
      
      // Should still render the component structure
      expect(screen.getByText(/Chairman:/)).toBeInTheDocument();
    });
  });

  describe('Component Structure', () => {
    it('has correct CSS classes', () => {
      const { container } = render(<Stage3 finalResponse={mockFinalResponse} />);
      
      expect(container.querySelector('.stage')).toBeInTheDocument();
      expect(container.querySelector('.stage3')).toBeInTheDocument();
      expect(container.querySelector('.final-response')).toBeInTheDocument();
    });

    it('renders markdown content wrapper', () => {
      const { container } = render(<Stage3 finalResponse={mockFinalResponse} />);
      
      expect(container.querySelector('.markdown-content')).toBeInTheDocument();
    });

    it('renders chairman label', () => {
      const { container } = render(<Stage3 finalResponse={mockFinalResponse} />);
      
      expect(container.querySelector('.chairman-label')).toBeInTheDocument();
    });
  });

  describe('Different Chairman Models', () => {
    it('displays OpenAI chairman', () => {
      const openaiResponse = {
        model: 'openai/gpt-4',
        response: 'Final answer',
      };
      
      render(<Stage3 finalResponse={openaiResponse} />);
      
      expect(screen.getByText(/gpt-4/)).toBeInTheDocument();
    });

    it('displays Anthropic chairman', () => {
      const anthropicResponse = {
        model: 'anthropic/claude-3-opus',
        response: 'Final answer',
      };
      
      render(<Stage3 finalResponse={anthropicResponse} />);
      
      expect(screen.getByText(/claude-3-opus/)).toBeInTheDocument();
    });

    it('displays Google chairman', () => {
      const googleResponse = {
        model: 'google/gemini-pro',
        response: 'Final answer',
      };
      
      render(<Stage3 finalResponse={googleResponse} />);
      
      expect(screen.getByText(/gemini-pro/)).toBeInTheDocument();
    });
  });
});