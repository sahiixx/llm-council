import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Stage1 from '../Stage1';

describe('Stage1 Component', () => {
  it('should return null when no responses', () => {
    const { container } = render(<Stage1 responses={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('should return null when responses is null', () => {
    const { container } = render(<Stage1 responses={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render stage title', () => {
    const responses = [
      { model: 'openai/gpt-4', response: 'Response 1' },
    ];
    render(<Stage1 responses={responses} />);
    expect(screen.getByText('Stage 1: Individual Responses')).toBeInTheDocument();
  });

  it('should render tabs for each model', () => {
    const responses = [
      { model: 'openai/gpt-4', response: 'R1' },
      { model: 'anthropic/claude', response: 'R2' },
    ];
    render(<Stage1 responses={responses} />);
    expect(screen.getByText('gpt-4')).toBeInTheDocument();
    expect(screen.getByText('claude')).toBeInTheDocument();
  });

  it('should show first response by default', () => {
    const responses = [
      { model: 'openai/gpt-4', response: 'First response' },
      { model: 'anthropic/claude', response: 'Second response' },
    ];
    render(<Stage1 responses={responses} />);
    expect(screen.getByText('First response')).toBeInTheDocument();
  });

  it('should switch tabs on click', async () => {
    const user = userEvent.setup();
    const responses = [
      { model: 'openai/gpt-4', response: 'First response' },
      { model: 'anthropic/claude', response: 'Second response' },
    ];
    render(<Stage1 responses={responses} />);
    
    await user.click(screen.getByText('claude'));
    expect(screen.getByText('Second response')).toBeInTheDocument();
  });

  it('should show full model name in content', () => {
    const responses = [
      { model: 'openai/gpt-4', response: 'Response' },
    ];
    render(<Stage1 responses={responses} />);
    expect(screen.getByText('openai/gpt-4')).toBeInTheDocument();
  });

  it('should handle model names without slash', () => {
    const responses = [
      { model: 'simple-model', response: 'Response' },
    ];
    render(<Stage1 responses={responses} />);
    expect(screen.getByText('simple-model')).toBeInTheDocument();
  });

  it('should render markdown in responses', () => {
    const responses = [
      { model: 'openai/gpt-4', response: '# Heading\n\nParagraph' },
    ];
    render(<Stage1 responses={responses} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Heading');
  });
});