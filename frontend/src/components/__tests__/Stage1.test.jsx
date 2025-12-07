/**
 * Comprehensive unit tests for Stage1.jsx
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Stage1 from '../Stage1';

describe('Stage1 Component', () => {
  const mockResponses = [
    { model: 'openai/gpt-4', response: 'Response from GPT-4' },
    { model: 'anthropic/claude-3', response: 'Response from Claude' },
    { model: 'google/gemini-pro', response: 'Response from Gemini' },
  ];

  describe('Rendering', () => {
    it('should render stage title', () => {
      render(<Stage1 responses={mockResponses} />);
      expect(screen.getByText(/stage 1.*individual responses/i)).toBeInTheDocument();
    });

    it('should render tabs for each response', () => {
      render(<Stage1 responses={mockResponses} />);
      expect(screen.getByText('gpt-4')).toBeInTheDocument();
      expect(screen.getByText('claude-3')).toBeInTheDocument();
      expect(screen.getByText('gemini-pro')).toBeInTheDocument();
    });

    it('should render first response by default', () => {
      render(<Stage1 responses={mockResponses} />);
      expect(screen.getByText('Response from GPT-4')).toBeInTheDocument();
    });

    it('should show full model name in content', () => {
      render(<Stage1 responses={mockResponses} />);
      expect(screen.getByText('openai/gpt-4')).toBeInTheDocument();
    });

    it('should return null for empty responses', () => {
      const { container } = render(<Stage1 responses={[]} />);
      expect(container.firstChild).toBeNull();
    });

    it('should return null for null responses', () => {
      const { container } = render(<Stage1 responses={null} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Tab Switching', () => {
    it('should switch tabs on click', async () => {
      const user = userEvent.setup();
      render(<Stage1 responses={mockResponses} />);

      const claudeTab = screen.getByText('claude-3');
      await user.click(claudeTab);

      expect(screen.getByText('Response from Claude')).toBeInTheDocument();
    });

    it('should highlight active tab', async () => {
      const user = userEvent.setup();
      const { container } = render(<Stage1 responses={mockResponses} />);

      const claudeTab = screen.getByText('claude-3');
      await user.click(claudeTab);

      const activeTab = container.querySelector('.tab.active');
      expect(activeTab).toHaveTextContent('claude-3');
    });

    it('should switch between multiple tabs', async () => {
      const user = userEvent.setup();
      render(<Stage1 responses={mockResponses} />);

      await user.click(screen.getByText('claude-3'));
      expect(screen.getByText('Response from Claude')).toBeInTheDocument();

      await user.click(screen.getByText('gemini-pro'));
      expect(screen.getByText('Response from Gemini')).toBeInTheDocument();

      await user.click(screen.getByText('gpt-4'));
      expect(screen.getByText('Response from GPT-4')).toBeInTheDocument();
    });
  });

  describe('Model Name Parsing', () => {
    it('should extract model name from provider/model format', () => {
      render(<Stage1 responses={mockResponses} />);
      expect(screen.getByText('gpt-4')).toBeInTheDocument();
    });

    it('should handle models without provider prefix', () => {
      const responses = [{ model: 'simple-model', response: 'Test response' }];
      render(<Stage1 responses={responses} />);
      expect(screen.getByText('simple-model')).toBeInTheDocument();
    });

    it('should handle models with multiple slashes', () => {
      const responses = [{ model: 'provider/category/model-name', response: 'Test' }];
      render(<Stage1 responses={responses} />);
      expect(screen.getByText('category/model-name')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle single response', () => {
      const responses = [{ model: 'model1', response: 'Only response' }];
      render(<Stage1 responses={responses} />);
      expect(screen.getByText('Only response')).toBeInTheDocument();
    });

    it('should handle empty response content', () => {
      const responses = [{ model: 'model1', response: '' }];
      render(<Stage1 responses={responses} />);
      expect(screen.getByText('model1')).toBeInTheDocument();
    });

    it('should handle markdown in responses', () => {
      const responses = [{ model: 'model1', response: '**Bold** and *italic*' }];
      expect(() => {
        render(<Stage1 responses={responses} />);
      }).not.toThrow();
    });

    it('should handle very long responses', () => {
      const longResponse = 'A'.repeat(50000);
      const responses = [{ model: 'model1', response: longResponse }];
      expect(() => {
        render(<Stage1 responses={responses} />);
      }).not.toThrow();
    });
  });
});