import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Stage3 from '../../components/Stage3';

vi.mock('react-markdown', () => ({
  default: ({ children }) => <div>{children}</div>,
}));

describe('Stage3', () => {
  const mockResponse = {
    model: 'google/gemini-pro',
    response: 'This is the final synthesized answer from the council.',
  };

  it('renders stage title', () => {
    render(<Stage3 finalResponse={mockResponse} />);
    expect(screen.getByText('Stage 3: Final Council Answer')).toBeInTheDocument();
  });

  it('displays chairman model name', () => {
    render(<Stage3 finalResponse={mockResponse} />);
    expect(screen.getByText(/Chairman:.*gemini-pro/)).toBeInTheDocument();
  });

  it('displays final response text', () => {
    render(<Stage3 finalResponse={mockResponse} />);
    expect(screen.getByText('This is the final synthesized answer from the council.')).toBeInTheDocument();
  });

  it('returns null when no response provided', () => {
    const { container } = render(<Stage3 finalResponse={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('handles model names without slashes', () => {
    const response = { model: 'simple-model', response: 'Answer' };
    render(<Stage3 finalResponse={response} />);
    expect(screen.getByText(/Chairman:.*simple-model/)).toBeInTheDocument();
  });
});