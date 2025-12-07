/**
 * Comprehensive unit tests for Stage1 component
 */

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Stage1 from '../../components/Stage1';

describe('Stage1', () => {
  const mockResponses = [
    { model: 'openai/gpt-4', response: 'Response from GPT-4' },
    { model: 'google/gemini-pro', response: 'Response from Gemini' },
    { model: 'anthropic/claude', response: 'Response from Claude' },
  ];

  it('should render stage title', () => {
    render(<Stage1 responses={mockResponses} />);
    expect(screen.getByText('Stage 1: Individual Responses')).toBeInTheDocument();
  });

  it('should render tabs for each model', () => {
    render(<Stage1 responses={mockResponses} />);
    
    expect(screen.getByText('gpt-4')).toBeInTheDocument();
    expect(screen.getByText('gemini-pro')).toBeInTheDocument();
    expect(screen.getByText('claude')).toBeInTheDocument();
  });

  it('should show first response by default', () => {
    render(<Stage1 responses={mockResponses} />);
    
    expect(screen.getByText('Response from GPT-4')).toBeInTheDocument();
    expect(screen.getByText('openai/gpt-4')).toBeInTheDocument();
  });

  it('should switch content when tab is clicked', () => {
    render(<Stage1 responses={mockResponses} />);
    
    const geminiTab = screen.getByText('gemini-pro');
    fireEvent.click(geminiTab);
    
    expect(screen.getByText('Response from Gemini')).toBeInTheDocument();
    expect(screen.getByText('google/gemini-pro')).toBeInTheDocument();
  });

  it('should highlight active tab', () => {
    render(<Stage1 responses={mockResponses} />);
    
    const tabs = screen.getAllByRole('button');
    expect(tabs[0]).toHaveClass('active');
  });

  it('should update active tab on click', () => {
    render(<Stage1 responses={mockResponses} />);
    
    const secondTab = screen.getByText('gemini-pro');
    fireEvent.click(secondTab);
    
    const tabs = screen.getAllByRole('button');
    expect(tabs[1]).toHaveClass('active');
  });

  it('should return null for empty responses', () => {
    const { container } = render(<Stage1 responses={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('should return null for null responses', () => {
    const { container } = render(<Stage1 responses={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('should handle single response', () => {
    const singleResponse = [
      { model: 'openai/gpt-4', response: 'Single response' },
    ];

    render(<Stage1 responses={singleResponse} />);
    
    expect(screen.getByText('gpt-4')).toBeInTheDocument();
    expect(screen.getByText('Single response')).toBeInTheDocument();
  });

  it('should extract short model name correctly', () => {
    const responses = [
      { model: 'provider/model-name', response: 'Test' },
    ];

    render(<Stage1 responses={responses} />);
    
    expect(screen.getByText('model-name')).toBeInTheDocument();
  });

  it('should handle model without slash separator', () => {
    const responses = [
      { model: 'model-only', response: 'Test' },
    ];

    render(<Stage1 responses={responses} />);
    
    expect(screen.getByText('model-only')).toBeInTheDocument();
  });

  it('should show full model name in content', () => {
    render(<Stage1 responses={mockResponses} />);
    
    expect(screen.getByText('openai/gpt-4')).toBeInTheDocument();
  });

  it('should render markdown in responses', () => {
    const markdownResponses = [
      { model: 'test/model', response: '**Bold text** and *italic*' },
    ];

    render(<Stage1 responses={markdownResponses} />);
    
    // ReactMarkdown should render the bold text
    const content = screen.getByText(/Bold text/);
    expect(content).toBeInTheDocument();
  });

  it('should handle very long responses', () => {
    const longResponse = 'A'.repeat(10000);
    const responses = [
      { model: 'test/model', response: longResponse },
    ];

    render(<Stage1 responses={responses} />);
    
    expect(screen.getByText(longResponse)).toBeInTheDocument();
  });

  it('should handle empty response content', () => {
    const responses = [
      { model: 'test/model', response: '' },
    ];

    render(<Stage1 responses={responses} />);
    
    expect(screen.getByText('test/model')).toBeInTheDocument();
  });

  it('should maintain tab state across re-renders', () => {
    const { rerender } = render(<Stage1 responses={mockResponses} />);
    
    const secondTab = screen.getByText('gemini-pro');
    fireEvent.click(secondTab);
    
    expect(screen.getByText('Response from Gemini')).toBeInTheDocument();
    
    // Re-render with same props
    rerender(<Stage1 responses={mockResponses} />);
    
    // Should still show second tab's content
    expect(screen.getByText('Response from Gemini')).toBeInTheDocument();
  });
});