/**
 * Comprehensive unit tests for frontend/src/components/Stage3.jsx
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Stage3 from './Stage3';

describe('Stage3 Component', () => {
  const mockFinalResponse = {
    model: 'google/gemini-pro',
    response: 'This is the final synthesized answer from the chairman.',
  };

  it('should render nothing when no finalResponse', () => {
    const { container } = render(<Stage3 finalResponse={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render stage title', () => {
    render(<Stage3 finalResponse={mockFinalResponse} />);
    expect(screen.getByText('Stage 3: Final Council Answer')).toBeInTheDocument();
  });

  it('should display chairman model name', () => {
    render(<Stage3 finalResponse={mockFinalResponse} />);
    expect(screen.getByText(/Chairman: gemini-pro/i)).toBeInTheDocument();
  });

  it('should display final response text', () => {
    render(<Stage3 finalResponse={mockFinalResponse} />);
    expect(screen.getByText('This is the final synthesized answer from the chairman.')).toBeInTheDocument();
  });

  it('should extract short model name from full identifier', () => {
    render(<Stage3 finalResponse={mockFinalResponse} />);
    
    // Should extract "gemini-pro" from "google/gemini-pro"
    expect(screen.getByText(/gemini-pro/)).toBeInTheDocument();
    expect(screen.queryByText('google/gemini-pro')).not.toBeInTheDocument();
  });

  it('should handle model name without slash', () => {
    const response = {
      model: 'simple-model',
      response: 'Final answer',
    };
    
    render(<Stage3 finalResponse={response} />);
    expect(screen.getByText(/Chairman: simple-model/i)).toBeInTheDocument();
  });

  it('should render markdown in final response', () => {
    const response = {
      model: 'test/model',
      response: '# Heading\n\n**Bold text**\n\n- List item',
    };
    
    render(<Stage3 finalResponse={response} />);
    
    expect(screen.getByText('Heading').tagName).toBe('H1');
    expect(screen.getByText('Bold text').tagName).toBe('STRONG');
  });

  it('should handle empty response text', () => {
    const response = {
      model: 'test/model',
      response: '',
    };
    
    render(<Stage3 finalResponse={response} />);
    expect(screen.getByText('Stage 3: Final Council Answer')).toBeInTheDocument();
  });

  it('should handle very long response', () => {
    const longResponse = 'A'.repeat(10000);
    const response = {
      model: 'test/model',
      response: longResponse,
    };
    
    render(<Stage3 finalResponse={response} />);
    expect(screen.getByText(longResponse)).toBeInTheDocument();
  });

  it('should handle response with special characters', () => {
    const response = {
      model: 'test/model',
      response: 'Response with émojis 🎉 and 你好',
    };
    
    render(<Stage3 finalResponse={response} />);
    expect(screen.getByText(/émojis 🎉 and 你好/)).toBeInTheDocument();
  });
});