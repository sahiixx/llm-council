/**
 * Comprehensive unit tests for Stage3 component
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Stage3 from './Stage3';

describe('Stage3 Component', () => {
  const mockFinalResponse = {
    model: 'google/gemini-pro',
    response: 'This is the final synthesized answer from the chairman.',
  };

  describe('Rendering', () => {
    it('should render null when no final response', () => {
      const { container } = render(<Stage3 finalResponse={null} />);
      expect(container.firstChild).toBeNull();
    });

    it('should render stage title', () => {
      render(<Stage3 finalResponse={mockFinalResponse} />);
      expect(screen.getByText('Stage 3: Final Council Answer')).toBeInTheDocument();
    });

    it('should display chairman label', () => {
      render(<Stage3 finalResponse={mockFinalResponse} />);
      expect(screen.getByText(/Chairman:/)).toBeInTheDocument();
    });

    it('should display chairman model name', () => {
      render(<Stage3 finalResponse={mockFinalResponse} />);
      expect(screen.getByText(/gemini-pro/)).toBeInTheDocument();
    });

    it('should render final response text', () => {
      render(<Stage3 finalResponse={mockFinalResponse} />);
      expect(screen.getByText('This is the final synthesized answer from the chairman.')).toBeInTheDocument();
    });

    it('should handle markdown in response', () => {
      const markdownResponse = {
        model: 'test/model',
        response: '# Final Answer\n**Important:** This is the result.',
      };
      
      render(<Stage3 finalResponse={markdownResponse} />);
      expect(screen.getByText('Final Answer')).toBeInTheDocument();
      expect(screen.getByText(/Important:/)).toBeInTheDocument();
    });

    it('should handle model without slash', () => {
      const simpleModel = {
        model: 'chairman',
        response: 'Final answer',
      };
      
      render(<Stage3 finalResponse={simpleModel} />);
      expect(screen.getByText(/chairman/)).toBeInTheDocument();
    });

    it('should handle very long responses', () => {
      const longResponse = {
        model: 'test/model',
        response: 'Long answer: ' + 'A'.repeat(5000),
      };
      
      render(<Stage3 finalResponse={longResponse} />);
      expect(screen.getByText(/Long answer:/)).toBeInTheDocument();
    });
  });
});