/**
 * Comprehensive unit tests for frontend/src/components/Stage1.jsx
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Stage1 from './Stage1';

describe('Stage1 Component', () => {
  const mockResponses = [
    { model: 'openai/gpt-4', response: 'Response from GPT-4' },
    { model: 'anthropic/claude-3', response: 'Response from Claude' },
    { model: 'google/gemini-pro', response: 'Response from Gemini' }
  ];

  describe('Rendering', () => {
    it('should render stage title', () => {
      render(<Stage1 responses={mockResponses} />);
      expect(screen.getByText('Stage 1: Individual Responses')).toBeInTheDocument();
    });

    it('should render tabs for each model', () => {
      render(<Stage1 responses={mockResponses} />);
      
      expect(screen.getByText('gpt-4')).toBeInTheDocument();
      expect(screen.getByText('claude-3')).toBeInTheDocument();
      expect(screen.getByText('gemini-pro')).toBeInTheDocument();
    });

    it('should display first response by default', () => {
      render(<Stage1 responses={mockResponses} />);
      
      expect(screen.getByText('openai/gpt-4')).toBeInTheDocument();
      expect(screen.getByText('Response from GPT-4')).toBeInTheDocument();
    });

    it('should not render when responses is null', () => {
      const { container } = render(<Stage1 responses={null} />);
      expect(container.firstChild).toBeNull();
    });

    it('should not render when responses is empty array', () => {
      const { container } = render(<Stage1 responses={[]} />);
      expect(container.firstChild).toBeNull();
    });

    it('should not render when responses is undefined', () => {
      const { container } = render(<Stage1 responses={undefined} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Tab Interaction', () => {
    it('should switch to second tab when clicked', async () => {
      render(<Stage1 responses={mockResponses} />);
      
      await userEvent.click(screen.getByText('claude-3'));
      
      expect(screen.getByText('anthropic/claude-3')).toBeInTheDocument();
      expect(screen.getByText('Response from Claude')).toBeInTheDocument();
    });

    it('should switch to third tab when clicked', async () => {
      render(<Stage1 responses={mockResponses} />);
      
      await userEvent.click(screen.getByText('gemini-pro'));
      
      expect(screen.getByText('google/gemini-pro')).toBeInTheDocument();
      expect(screen.getByText('Response from Gemini')).toBeInTheDocument();
    });

    it('should highlight active tab', async () => {
      const { container } = render(<Stage1 responses={mockResponses} />);
      
      const tabs = container.querySelectorAll('.tab');
      expect(tabs[0]).toHaveClass('active');
      
      await userEvent.click(screen.getByText('claude-3'));
      
      expect(tabs[1]).toHaveClass('active');
      expect(tabs[0]).not.toHaveClass('active');
    });

    it('should allow switching between tabs multiple times', async () => {
      render(<Stage1 responses={mockResponses} />);
      
      await userEvent.click(screen.getByText('claude-3'));
      expect(screen.getByText('Response from Claude')).toBeInTheDocument();
      
      await userEvent.click(screen.getByText('gemini-pro'));
      expect(screen.getByText('Response from Gemini')).toBeInTheDocument();
      
      await userEvent.click(screen.getByText('gpt-4'));
      expect(screen.getByText('Response from GPT-4')).toBeInTheDocument();
    });
  });

  describe('Model Name Display', () => {
    it('should display short model name in tab', () => {
      render(<Stage1 responses={mockResponses} />);
      
      // Tabs should show only the model name after the slash
      expect(screen.getByText('gpt-4')).toBeInTheDocument();
      expect(screen.queryByText('openai/gpt-4')).not.toBeInTheDocument();
    });

    it('should display full model name in content area', () => {
      render(<Stage1 responses={mockResponses} />);
      
      expect(screen.getByText('openai/gpt-4')).toBeInTheDocument();
    });

    it('should handle model names without slash', () => {
      const singleNameResponse = [
        { model: 'custom-model', response: 'Response' }
      ];
      
      render(<Stage1 responses={singleNameResponse} />);
      
      expect(screen.getByText('custom-model')).toBeInTheDocument();
    });

    it('should handle empty model name gracefully', () => {
      const emptyModelResponse = [
        { model: '', response: 'Response' }
      ];
      
      render(<Stage1 responses={emptyModelResponse} />);
      
      // Should not crash
      expect(screen.getByText('Stage 1: Individual Responses')).toBeInTheDocument();
    });
  });

  describe('Response Content', () => {
    it('should render markdown in responses', () => {
      const markdownResponses = [
        { model: 'test/model', response: '# Heading\n\n**Bold text**' }
      ];
      
      render(<Stage1 responses={markdownResponses} />);
      
      expect(screen.getByText(/Heading/)).toBeInTheDocument();
    });

    it('should handle very long responses', () => {
      const longResponse = 'A'.repeat(10000);
      const longResponses = [
        { model: 'test/model', response: longResponse }
      ];
      
      render(<Stage1 responses={longResponses} />);
      
      expect(screen.getByText(longResponse)).toBeInTheDocument();
    });

    it('should handle empty response content', () => {
      const emptyResponses = [
        { model: 'test/model', response: '' }
      ];
      
      render(<Stage1 responses={emptyResponses} />);
      
      expect(screen.getByText('test/model')).toBeInTheDocument();
    });

    it('should handle responses with special characters', () => {
      const specialResponses = [
        { model: 'test/model', response: 'Test <>&"\' 你好 🌍' }
      ];
      
      render(<Stage1 responses={specialResponses} />);
      
      expect(screen.getByText('Test <>&"\' 你好 🌍')).toBeInTheDocument();
    });

    it('should handle multiline responses', () => {
      const multilineResponses = [
        { model: 'test/model', response: 'Line 1\nLine 2\nLine 3' }
      ];
      
      render(<Stage1 responses={multilineResponses} />);
      
      expect(screen.getByText(/Line 1/)).toBeInTheDocument();
    });
  });

  describe('Multiple Responses', () => {
    it('should handle single response', () => {
      const singleResponse = [
        { model: 'test/model', response: 'Single response' }
      ];
      
      render(<Stage1 responses={singleResponse} />);
      
      expect(screen.getByText('test/model')).toBeInTheDocument();
      expect(screen.getByText('Single response')).toBeInTheDocument();
    });

    it('should handle many responses', () => {
      const manyResponses = Array.from({ length: 10 }, (_, i) => ({
        model: `provider${i}/model${i}`,
        response: `Response ${i}`
      }));
      
      render(<Stage1 responses={manyResponses} />);
      
      expect(screen.getByText('model0')).toBeInTheDocument();
      expect(screen.getByText('model9')).toBeInTheDocument();
    });

    it('should maintain state when switching between many tabs', async () => {
      const manyResponses = Array.from({ length: 5 }, (_, i) => ({
        model: `provider${i}/model${i}`,
        response: `Response ${i}`
      }));
      
      render(<Stage1 responses={manyResponses} />);
      
      await userEvent.click(screen.getByText('model2'));
      expect(screen.getByText('Response 2')).toBeInTheDocument();
      
      await userEvent.click(screen.getByText('model4'));
      expect(screen.getByText('Response 4')).toBeInTheDocument();
      
      await userEvent.click(screen.getByText('model0'));
      expect(screen.getByText('Response 0')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle responses with null model', () => {
      const nullModelResponses = [
        { model: null, response: 'Response' }
      ];
      
      const { container } = render(<Stage1 responses={nullModelResponses} />);
      
      // Should not crash
      expect(container.querySelector('.stage1')).toBeInTheDocument();
    });

    it('should handle responses with null response text', () => {
      const nullResponseText = [
        { model: 'test/model', response: null }
      ];
      
      render(<Stage1 responses={nullResponseText} />);
      
      expect(screen.getByText('test/model')).toBeInTheDocument();
    });

    it('should handle responses with missing fields', () => {
      const incompleteResponses = [
        { model: 'test/model' } // missing response
      ];
      
      const { container } = render(<Stage1 responses={incompleteResponses} />);
      
      // Should not crash
      expect(container.querySelector('.stage1')).toBeInTheDocument();
    });
  });
});