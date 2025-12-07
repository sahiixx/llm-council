import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChatInterface from '../../components/ChatInterface';

vi.mock('react-markdown', () => ({
  default: ({ children }) => <div>{children}</div>,
}));

vi.mock('../../components/Stage1', () => ({
  default: () => <div data-testid="stage1">Stage 1</div>,
}));

vi.mock('../../components/Stage2', () => ({
  default: () => <div data-testid="stage2">Stage 2</div>,
}));

vi.mock('../../components/Stage3', () => ({
  default: () => <div data-testid="stage3">Stage 3</div>,
}));

describe('ChatInterface', () => {
  it('shows welcome message when no conversation', () => {
    render(<ChatInterface conversation={null} onSendMessage={vi.fn()} isLoading={false} />);
    expect(screen.getByText('Welcome to LLM Council')).toBeInTheDocument();
  });

  it('shows empty conversation state', () => {
    const conv = { id: '1', title: 'Test', messages: [] };
    render(<ChatInterface conversation={conv} onSendMessage={vi.fn()} isLoading={false} />);
    expect(screen.getByText('Start a conversation')).toBeInTheDocument();
  });

  it('displays user and assistant messages', () => {
    const conv = {
      id: '1',
      title: 'Test',
      messages: [
        { role: 'user', content: 'Hello' },
        {
          role: 'assistant',
          stage1: [{ model: 'm1', response: 'Hi' }],
          stage2: [],
          stage3: { model: 'chairman', response: 'Final' },
        },
      ],
    };

    render(<ChatInterface conversation={conv} onSendMessage={vi.fn()} isLoading={false} />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('sends message on form submit', async () => {
    const handleSend = vi.fn();
    const conv = { id: '1', title: 'Test', messages: [] };

    render(<ChatInterface conversation={conv} onSendMessage={handleSend} isLoading={false} />);

    const input = screen.getByRole('textbox');
    await userEvent.type(input, 'Test message');
    await userEvent.type(input, '{Enter}');

    expect(handleSend).toHaveBeenCalledWith('Test message');
  });

  it('clears input after sending', async () => {
    const conv = { id: '1', title: 'Test', messages: [] };
    render(<ChatInterface conversation={conv} onSendMessage={vi.fn()} isLoading={false} />);

    const input = screen.getByRole('textbox');
    await userEvent.type(input, 'Test{Enter}');

    expect(input).toHaveValue('');
  });

  it('disables sending when loading', async () => {
    const handleSend = vi.fn();
    const conv = { id: '1', title: 'Test', messages: [] };

    render(<ChatInterface conversation={conv} onSendMessage={handleSend} isLoading={true} />);

    const input = screen.getByRole('textbox');
    await userEvent.type(input, 'Test{Enter}');

    expect(handleSend).not.toHaveBeenCalled();
  });

  it('shows loading indicators during stages', () => {
    const conv = {
      id: '1',
      title: 'Test',
      messages: [
        {
          role: 'assistant',
          loading: { stage1: true, stage2: false, stage3: false },
        },
      ],
    };

    render(<ChatInterface conversation={conv} onSendMessage={vi.fn()} isLoading={false} />);
    expect(screen.getByText(/Stage 1.*individual responses/i)).toBeInTheDocument();
  });
});