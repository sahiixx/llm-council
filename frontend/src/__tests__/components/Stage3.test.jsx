/**
 * Comprehensive unit tests for Stage3 component
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Stage3 from '../../components/Stage3';

describe('Stage3', () => {
  const mockFinalResponse = {
    model: 'google/gemini-pro',
    response: 'This is the final synthesized answer from the council.',
  };

  it('should render stage title', () => {
    render(<Stage3 finalResponse={mockFinalResponse} />);
    expect(screen.getByText('Stage 3: Final Council Answer')).toBeInTheDocument();
  });

  it('should render chairman label with model name', () => {
    render(<Stage3 finalResponse={mockFinalResponse} />);
    expect(screen.getByText(/Chairman:/)).toBeInTheDocument();
    expect(screen.getByText(/gemini-pro/)).toBeInTheDocument();
  });

  it('should render final response content', () => {
    render(<Stage3 finalResponse={mockFinalResponse} />);
    expect(screen.getByText('This is the final synthesized answer from the council.')).toBeInTheDocument();
  });

  it('should return null when finalResponse is null', () => {
    const { container } = render(<Stage3 finalResponse={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('should return null when finalResponse is undefined', () => {
    const { container } = render(<Stage3 finalResponse={undefined} />);
    expect(container.firstChild).toBeNull();
  });

  it('should extract short model name from full identifier', () => {
    const response = {
      model: 'openai/gpt-4-turbo',
      response: 'Final answer',
    };

    render(<Stage3 finalResponse={response} />);
    expect(screen.getByText(/gpt-4-turbo/)).toBeInTheDocument();
  });

  it('should handle model without slash separator', () => {
    const response = {
      model: 'simple-model',
      response: 'Final answer',
    };

    render(<Stage3 finalResponse={response} />);
    expect(screen.getByText(/simple-model/)).toBeInTheDocument();
  });

  it('should render markdown in response', () => {
    const markdownResponse = {
      model: 'test/model',
      response: '**Bold text** and *italic* text',
    };

    render(<Stage3 finalResponse={markdownResponse} />);
    
    const boldText = screen.getByText(/Bold text/);
    expect(boldText).toBeInTheDocument();
  });

  it('should handle very long responses', () => {
    const longResponse = {
      model: 'test/model',
      response: 'A'.repeat(10000),
    };

    render(<Stage3 finalResponse={longResponse} />);
    
    expect(screen.getByText('A'.repeat(10000))).toBeInTheDocument();
  });

  it('should handle empty response content', () => {
    const emptyResponse = {
      model: 'test/model',
      response: '',
    };

    render(<Stage3 finalResponse={emptyResponse} />);
    
    expect(screen.getByText('Stage 3: Final Council Answer')).toBeInTheDocument();
  });

  it('should handle responses with line breaks', () => {
    const multilineResponse = {
      model: 'test/model',
      response: 'Line 1\nLine 2\nLine 3',
    };

    render(<Stage3 finalResponse={multilineResponse} />);
    
    expect(screen.getByText(/Line 1/)).toBeInTheDocument();
  });

  it('should handle responses with code blocks', () => {
    const codeResponse = {
      model: 'test/model',
      response: '```python\nprint("hello")\n```',
    };

    render(<Stage3 finalResponse={codeResponse} />);
    
    // Markdown should render code block
    expect(screen.getByText(/print/)).toBeInTheDocument();
  });

  it('should handle responses with lists', () => {
    const listResponse = {
      model: 'test/model',
      response: '1. First item\n2. Second item\n3. Third item',
    };

    render(<Stage3 finalResponse={listResponse} />);
    
    expect(screen.getByText(/First item/)).toBeInTheDocument();
    expect(screen.getByText(/Second item/)).toBeInTheDocument();
  });

  it('should handle responses with links', () => {
    const linkResponse = {
      model: 'test/model',
      response: 'Check out [this link](https://example.com)',
    };

    render(<Stage3 finalResponse={linkResponse} />);
    
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', 'https://example.com');
  });

  it('should handle unicode characters in response', () => {
    const unicodeResponse = {
      model: 'test/model',
      response: 'Hello 世界 🌍',
    };

    render(<Stage3 finalResponse={unicodeResponse} />);
    
    expect(screen.getByText(/Hello 世界 🌍/)).toBeInTheDocument();
  });

  it('should display full model name in chairman label', () => {
    render(<Stage3 finalResponse={mockFinalResponse} />);
    
    const chairmanLabel = screen.getByText(/Chairman:/);
    expect(chairmanLabel.textContent).toContain('gemini-pro');
  });
});