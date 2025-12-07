/**
 * Comprehensive unit tests for frontend/src/components/Stage1.jsx
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Stage1 from './Stage1';

describe('Stage1 Component', () => {
  const mockResponses = [
    { model: 'openai/gpt-4', response: 'Response from GPT-4' },
    { model: 'anthropic/claude', response: 'Response from Claude' },
    { model: 'google/gemini', response: 'Response from Gemini' },
  ];

  it('should render nothing when no responses', () => {
    const { container } = render(<Stage1 responses={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render nothing when responses is null', () => {
    const { container } = render(<Stage1 responses={null} />);
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

  it('should show first response by default', () => {
    render(<Stage1 responses={mockResponses} />);
    expect(screen.getByText('Response from GPT-4')).toBeInTheDocument();
  });

  it('should switch tabs when clicked', async () => {
    render(<Stage1 responses={mockResponses} />);
    
    const claudeTab = screen.getByText('claude');
    await userEvent.click(claudeTab);
    
    expect(screen.getByText('Response from Claude')).toBeInTheDocument();
    expect(screen.queryByText('Response from GPT-4')).not.toBeInTheDocument();
  });

  it('should display full model name', () => {
    render(<Stage1 responses={mockResponses} />);
    expect(screen.getByText('openai/gpt-4')).toBeInTheDocument();
  });

  it('should handle model names without slash', () => {
    const responses = [{ model: 'simple-model', response: 'Response' }];
    render(<Stage1 responses={responses} />);
    
    expect(screen.getByText('simple-model')).toBeInTheDocument();
  });

  it('should highlight active tab', async () => {
    const { container } = render(<Stage1 responses={mockResponses} />);
    
    const tabs = container.querySelectorAll('.tab');
    expect(tabs[0]).toHaveClass('active');
    
    await userEvent.click(tabs[1]);
    expect(tabs[1]).toHaveClass('active');
    expect(tabs[0]).not.toHaveClass('active');
  });

  it('should render markdown in responses', () => {
    const responses = [{
      model: 'test/model',
      response: '# Heading\n\n**Bold text**',
    }];
    
    render(<Stage1 responses={responses} />);
    
    const content = screen.getByText('Bold text');
    expect(content.tagName).toBe('STRONG');
  });

  it('should handle single response', () => {
    const responses = [{ model: 'test/model', response: 'Single response' }];
    render(<Stage1 responses={responses} />);
    
    expect(screen.getByText('model')).toBeInTheDocument();
    expect(screen.getByText('Single response')).toBeInTheDocument();
  });

  it('should handle empty response text', () => {
    const responses = [{ model: 'test/model', response: '' }];
    render(<Stage1 responses={responses} />);
    
    expect(screen.getByText('test/model')).toBeInTheDocument();
  });
});