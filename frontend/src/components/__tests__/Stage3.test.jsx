import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Stage3 from '../Stage3';

describe('Stage3 Component', () => {
  it('should return null when no finalResponse', () => {
    const { container } = render(<Stage3 finalResponse={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render stage title', () => {
    const finalResponse = {
      model: 'openai/gpt-4',
      response: 'Final answer',
    };
    render(<Stage3 finalResponse={finalResponse} />);
    expect(screen.getByText('Stage 3: Final Council Answer')).toBeInTheDocument();
  });

  it('should show chairman label with model name', () => {
    const finalResponse = {
      model: 'google/gemini-pro',
      response: 'Final answer',
    };
    render(<Stage3 finalResponse={finalResponse} />);
    expect(screen.getByText(/Chairman: gemini-pro/)).toBeInTheDocument();
  });

  it('should render final response text', () => {
    const finalResponse = {
      model: 'openai/gpt-4',
      response: 'This is the final synthesized answer.',
    };
    render(<Stage3 finalResponse={finalResponse} />);
    expect(screen.getByText('This is the final synthesized answer.')).toBeInTheDocument();
  });

  it('should render markdown in response', () => {
    const finalResponse = {
      model: 'openai/gpt-4',
      response: '# Final Answer\n\nThis is **bold**.',
    };
    render(<Stage3 finalResponse={finalResponse} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Final Answer');
    expect(screen.getByText('bold')).toBeInTheDocument();
  });

  it('should handle model names without slash', () => {
    const finalResponse = {
      model: 'simple-model',
      response: 'Answer',
    };
    render(<Stage3 finalResponse={finalResponse} />);
    expect(screen.getByText(/Chairman: simple-model/)).toBeInTheDocument();
  });
});