import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Stage1 from '../../components/Stage1';

vi.mock('react-markdown', () => ({
  default: ({ children }) => <div>{children}</div>,
}));

describe('Stage1', () => {
  const mockResponses = [
    { model: 'openai/gpt-4', response: 'Response from GPT-4' },
    { model: 'anthropic/claude', response: 'Response from Claude' },
  ];

  it('renders stage title', () => {
    render(<Stage1 responses={mockResponses} />);
    expect(screen.getByText('Stage 1: Individual Responses')).toBeInTheDocument();
  });

  it('displays tabs for each model', () => {
    render(<Stage1 responses={mockResponses} />);
    expect(screen.getByText('gpt-4')).toBeInTheDocument();
    expect(screen.getByText('claude')).toBeInTheDocument();
  });

  it('shows first response by default', () => {
    render(<Stage1 responses={mockResponses} />);
    expect(screen.getByText('Response from GPT-4')).toBeInTheDocument();
  });

  it('switches tabs on click', async () => {
    render(<Stage1 responses={mockResponses} />);
    
    await userEvent.click(screen.getByText('claude'));
    
    expect(screen.getByText('Response from Claude')).toBeInTheDocument();
  });

  it('returns null for empty responses', () => {
    const { container } = render(<Stage1 responses={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null for null responses', () => {
    const { container } = render(<Stage1 responses={null} />);
    expect(container.firstChild).toBeNull();
  });
});