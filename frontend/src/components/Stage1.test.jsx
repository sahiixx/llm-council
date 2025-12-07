/**
 * Comprehensive unit tests for Stage1 component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Stage1 from './Stage1';

describe('Stage1 Component', () => {
  const mockResponses = [
    { model: 'openai/gpt-4', response: 'Response from GPT-4' },
    { model: 'anthropic/claude', response: 'Response from Claude' },
    { model: 'google/gemini', response: 'Response from Gemini' },
  ];

  describe('Rendering', () => {
    it('should render null when no responses', () => {
      const { container } = render(<Stage1 responses={null} />);
      expect(container.firstChild).toBeNull();
    });

    it('should render null when empty responses array', () => {
      const { container } = render(<Stage1 responses={[]} />);
      expect(container.firstChild).toBeNull();
    });

    it('should render stage title', () => {
      render(<Stage1 responses={mockResponses} />);
      expect(screen.getByText('Stage 1: Individual Responses')).toBeInTheDocument();
    });

    it('should render tabs for each model', () => {
      render(<Stage1 responses={mockResponses} />);
      expect(screen.getByText('gpt-4')).toBeInTheDocument();
      expect(screen.getByText('claude')).toBeInTheDocument();
      expect(screen.getByText('gemini')).toBeInTheDocument();
    });

    it('should render first response by default', () => {
      render(<Stage1 responses={mockResponses} />);
      expect(screen.getByText('Response from GPT-4')).toBeInTheDocument();
    });

    it('should display full model name', () => {
      render(<Stage1 responses={mockResponses} />);
      expect(screen.getByText('openai/gpt-4')).toBeInTheDocument();
    });
  });

  describe('Tab Switching', () => {
    it('should switch to second tab when clicked', () => {
      render(<Stage1 responses={mockResponses} />);
      
      const claudeTab = screen.getByText('claude');
      fireEvent.click(claudeTab);
      
      expect(screen.getByText('Response from Claude')).toBeInTheDocument();
    });

    it('should highlight active tab', () => {
      const { container } = render(<Stage1 responses={mockResponses} />);
      
      const tabs = container.querySelectorAll('.tab');
      expect(tabs[0]).toHaveClass('active');
      
      fireEvent.click(tabs[1]);
      expect(tabs[1]).toHaveClass('active');
      expect(tabs[0]).not.toHaveClass('active');
    });

    it('should switch between all tabs', () => {
      render(<Stage1 responses={mockResponses} />);
      
      fireEvent.click(screen.getByText('claude'));
      expect(screen.getByText('Response from Claude')).toBeInTheDocument();
      
      fireEvent.click(screen.getByText('gemini'));
      expect(screen.getByText('Response from Gemini')).toBeInTheDocument();
      
      fireEvent.click(screen.getByText('gpt-4'));
      expect(screen.getByText('Response from GPT-4')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle single response', () => {
      const singleResponse = [
        { model: 'openai/gpt-4', response: 'Single response' },
      ];
      
      render(<Stage1 responses={singleResponse} />);
      expect(screen.getByText('Single response')).toBeInTheDocument();
    });

    it('should handle response with markdown', () => {
      const markdownResponse = [
        { model: 'test/model', response: '# Heading\n**Bold text**' },
      ];
      
      render(<Stage1 responses={markdownResponse} />);
      expect(screen.getByText('Heading')).toBeInTheDocument();
    });

    it('should handle very long responses', () => {
      const longResponse = [
        { model: 'test/model', response: 'A'.repeat(10000) },
      ];
      
      render(<Stage1 responses={longResponse} />);
      expect(screen.getByText('A'.repeat(10000))).toBeInTheDocument();
    });

    it('should handle model without slash', () => {
      const simpleModel = [
        { model: 'simplemodel', response: 'Test' },
      ];
      
      render(<Stage1 responses={simpleModel} />);
      expect(screen.getByText('simplemodel')).toBeInTheDocument();
    });
  });
});