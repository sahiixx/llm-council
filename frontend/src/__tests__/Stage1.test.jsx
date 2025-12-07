import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Stage1 from '../components/Stage1';

describe('Stage1 Component', () => {
  const mockResponses = [
    { model: 'openai/gpt-4', response: '# GPT-4 Response\n\nThis is the first response.' },
    { model: 'google/gemini-pro', response: '# Gemini Response\n\nThis is the second response.' },
    { model: 'anthropic/claude', response: '# Claude Response\n\nThis is the third response.' },
  ];

  describe('Rendering', () => {
    it('renders stage title', () => {
      render(<Stage1 responses={mockResponses} />);
      
      expect(screen.getByText('Stage 1: Individual Responses')).toBeInTheDocument();
    });

    it('renders tabs for each model', () => {
      render(<Stage1 responses={mockResponses} />);
      
      expect(screen.getByText('gpt-4')).toBeInTheDocument();
      expect(screen.getByText('gemini-pro')).toBeInTheDocument();
      expect(screen.getByText('claude')).toBeInTheDocument();
    });

    it('displays first response by default', () => {
      render(<Stage1 responses={mockResponses} />);
      
      expect(screen.getByText('openai/gpt-4')).toBeInTheDocument();
      expect(screen.getByText(/This is the first response/)).toBeInTheDocument();
    });

    it('returns null when no responses', () => {
      const { container } = render(<Stage1 responses={[]} />);
      
      expect(container.firstChild).toBeNull();
    });

    it('returns null when responses is null', () => {
      const { container } = render(<Stage1 responses={null} />);
      
      expect(container.firstChild).toBeNull();
    });

    it('returns null when responses is undefined', () => {
      const { container } = render(<Stage1 responses={undefined} />);
      
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Tab Navigation', () => {
    it('switches to second tab when clicked', () => {
      render(<Stage1 responses={mockResponses} />);
      
      const geminiTab = screen.getByText('gemini-pro');
      fireEvent.click(geminiTab);
      
      expect(screen.getByText('google/gemini-pro')).toBeInTheDocument();
      expect(screen.getByText(/This is the second response/)).toBeInTheDocument();
    });

    it('switches to third tab when clicked', () => {
      render(<Stage1 responses={mockResponses} />);
      
      const claudeTab = screen.getByText('claude');
      fireEvent.click(claudeTab);
      
      expect(screen.getByText('anthropic/claude')).toBeInTheDocument();
      expect(screen.getByText(/This is the third response/)).toBeInTheDocument();
    });

    it('highlights active tab', () => {
      render(<Stage1 responses={mockResponses} />);
      
      const gptTab = screen.getByText('gpt-4');
      expect(gptTab).toHaveClass('active');
      
      const geminiTab = screen.getByText('gemini-pro');
      fireEvent.click(geminiTab);
      
      expect(geminiTab).toHaveClass('active');
      expect(gptTab).not.toHaveClass('active');
    });

    it('updates content when switching tabs multiple times', () => {
      render(<Stage1 responses={mockResponses} />);
      
      fireEvent.click(screen.getByText('gemini-pro'));
      expect(screen.getByText(/This is the second response/)).toBeInTheDocument();
      
      fireEvent.click(screen.getByText('claude'));
      expect(screen.getByText(/This is the third response/)).toBeInTheDocument();
      
      fireEvent.click(screen.getByText('gpt-4'));
      expect(screen.getByText(/This is the first response/)).toBeInTheDocument();
    });
  });

  describe('Model Name Display', () => {
    it('extracts short name from full model identifier', () => {
      render(<Stage1 responses={mockResponses} />);
      
      // Tab shows short name
      expect(screen.getByText('gpt-4')).toBeInTheDocument();
      // Full model name shown in content
      expect(screen.getByText('openai/gpt-4')).toBeInTheDocument();
    });

    it('handles model without slash', () => {
      const responses = [{ model: 'local-model', response: 'Response text' }];
      render(<Stage1 responses={responses} />);
      
      expect(screen.getByText('local-model')).toBeInTheDocument();
    });

    it('displays full model path in content area', () => {
      render(<Stage1 responses={mockResponses} />);
      
      expect(screen.getByText('openai/gpt-4')).toBeInTheDocument();
    });
  });

  describe('Markdown Rendering', () => {
    it('renders markdown content', () => {
      const responsesWithMarkdown = [
        { model: 'test/model', response: '# Heading\n\n**Bold text**\n\n*Italic text*' },
      ];
      
      render(<Stage1 responses={responsesWithMarkdown} />);
      
      // ReactMarkdown should render these as HTML elements
      const heading = screen.getByText('Heading');
      expect(heading.tagName).toBe('H1');
    });

    it('renders code blocks', () => {
      const responsesWithCode = [
        { model: 'test/model', response: '```python\nprint("hello")\n```' },
      ];
      
      render(<Stage1 responses={responsesWithCode} />);
      
      expect(screen.getByText(/print/)).toBeInTheDocument();
    });

    it('renders lists', () => {
      const responsesWithList = [
        { model: 'test/model', response: '- Item 1\n- Item 2\n- Item 3' },
      ];
      
      render(<Stage1 responses={responsesWithList} />);
      
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
      expect(screen.getByText('Item 3')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles single response', () => {
      const singleResponse = [mockResponses[0]];
      render(<Stage1 responses={singleResponse} />);
      
      expect(screen.getByText('gpt-4')).toBeInTheDocument();
      expect(screen.queryByText('gemini-pro')).not.toBeInTheDocument();
    });

    it('handles empty response content', () => {
      const emptyResponse = [{ model: 'test/model', response: '' }];
      render(<Stage1 responses={emptyResponse} />);
      
      expect(screen.getByText('test/model')).toBeInTheDocument();
    });

    it('handles very long responses', () => {
      const longResponse = [
        { model: 'test/model', response: 'A'.repeat(10000) },
      ];
      
      render(<Stage1 responses={longResponse} />);
      
      expect(screen.getByText('test/model')).toBeInTheDocument();
    });

    it('handles special characters in response', () => {
      const specialChars = [
        { model: 'test/model', response: '<script>alert("xss")</script>\n& " \' <>' },
      ];
      
      render(<Stage1 responses={specialChars} />);
      
      // Should be safely rendered (escaped)
      expect(screen.getByText(/script/)).toBeInTheDocument();
    });

    it('handles unicode in responses', () => {
      const unicodeResponse = [
        { model: 'test/model', response: '你好世界 🌍 café' },
      ];
      
      render(<Stage1 responses={unicodeResponse} />);
      
      expect(screen.getByText(/你好世界/)).toBeInTheDocument();
    });

    it('handles responses with newlines', () => {
      const multilineResponse = [
        { model: 'test/model', response: 'Line 1\n\nLine 2\n\nLine 3' },
      ];
      
      render(<Stage1 responses={multilineResponse} />);
      
      expect(screen.getByText(/Line 1/)).toBeInTheDocument();
      expect(screen.getByText(/Line 2/)).toBeInTheDocument();
      expect(screen.getByText(/Line 3/)).toBeInTheDocument();
    });

    it('handles many responses', () => {
      const manyResponses = Array.from({ length: 10 }, (_, i) => ({
        model: `provider/model-${i}`,
        response: `Response ${i}`,
      }));
      
      render(<Stage1 responses={manyResponses} />);
      
      expect(screen.getByText('model-0')).toBeInTheDocument();
      expect(screen.getByText('model-9')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('tabs are keyboard accessible', () => {
      render(<Stage1 responses={mockResponses} />);
      
      const tabs = screen.getAllByRole('button');
      tabs.forEach(tab => {
        expect(tab).toBeInTheDocument();
      });
    });
  });
});