import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChatInterface from '../ChatInterface';

describe('ChatInterface Component', () => {
  const mockProps = {
    conversation: null,
    onSendMessage: vi.fn(),
    isLoading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show empty state when no conversation', () => {
    render(<ChatInterface {...mockProps} />);
    expect(screen.getByText('Welcome to LLM Council')).toBeInTheDocument();
    expect(screen.getByText('Create a new conversation to get started')).toBeInTheDocument();
  });

  it('should show start message when conversation is empty', () => {
    const conversation = { id: '1', messages: [] };
    render(<ChatInterface {...mockProps} conversation={conversation} />);
    expect(screen.getByText('Start a conversation')).toBeInTheDocument();
  });

  it('should render input form when conversation exists', () => {
    const conversation = { id: '1', messages: [] };
    render(<ChatInterface {...mockProps} conversation={conversation} />);
    expect(screen.getByPlaceholderText(/Ask your question/i)).toBeInTheDocument();
  });

  it('should call onSendMessage when form submitted', async () => {
    const user = userEvent.setup();
    const onSendMessage = vi.fn();
    const conversation = { id: '1', messages: [] };
    
    render(
      <ChatInterface
        {...mockProps}
        conversation={conversation}
        onSendMessage={onSendMessage}
      />
    );
    
    const input = screen.getByPlaceholderText(/Ask your question/i);
    await user.type(input, 'Test message');
    await user.click(screen.getByText('Send'));
    
    expect(onSendMessage).toHaveBeenCalledWith('Test message');
  });

  it('should not submit empty message', async () => {
    const user = userEvent.setup();
    const onSendMessage = vi.fn();
    const conversation = { id: '1', messages: [] };
    
    render(
      <ChatInterface
        {...mockProps}
        conversation={conversation}
        onSendMessage={onSendMessage}
      />
    );
    
    await user.click(screen.getByText('Send'));
    expect(onSendMessage).not.toHaveBeenCalled();
  });

  it('should clear input after sending', async () => {
    const user = userEvent.setup();
    const conversation = { id: '1', messages: [] };
    
    render(<ChatInterface {...mockProps} conversation={conversation} />);
    
    const input = screen.getByPlaceholderText(/Ask your question/i);
    await user.type(input, 'Test message');
    await user.click(screen.getByText('Send'));
    
    expect(input).toHaveValue('');
  });

  it('should disable input when loading', () => {
    const conversation = { id: '1', messages: [] };
    render(<ChatInterface {...mockProps} conversation={conversation} isLoading={true} />);
    
    const input = screen.getByPlaceholderText(/Ask your question/i);
    expect(input).toBeDisabled();
  });

  it('should disable send button when loading', () => {
    const conversation = { id: '1', messages: [] };
    render(<ChatInterface {...mockProps} conversation={conversation} isLoading={true} />);
    
    const button = screen.getByText('Send');
    expect(button).toBeDisabled();
  });

  it('should render user messages', () => {
    const conversation = {
      id: '1',
      messages: [
        { role: 'user', content: 'Hello there!' },
      ],
    };
    render(<ChatInterface {...mockProps} conversation={conversation} />);
    expect(screen.getByText('Hello there!')).toBeInTheDocument();
  });

  it('should render loading indicator when isLoading', () => {
    const conversation = { id: '1', messages: [] };
    render(<ChatInterface {...mockProps} conversation={conversation} isLoading={true} />);
    expect(screen.getByText('Consulting the council...')).toBeInTheDocument();
  });

  it('should submit on Enter key', async () => {
    const user = userEvent.setup();
    const onSendMessage = vi.fn();
    const conversation = { id: '1', messages: [] };
    
    render(
      <ChatInterface
        {...mockProps}
        conversation={conversation}
        onSendMessage={onSendMessage}
      />
    );
    
    const input = screen.getByPlaceholderText(/Ask your question/i);
    await user.type(input, 'Test{Enter}');
    
    expect(onSendMessage).toHaveBeenCalledWith('Test');
  });

  it('should not submit on Shift+Enter', async () => {
    const user = userEvent.setup();
    const onSendMessage = vi.fn();
    const conversation = { id: '1', messages: [] };
    
    render(
      <ChatInterface
        {...mockProps}
        conversation={conversation}
        onSendMessage={onSendMessage}
      />
    );
    
    const input = screen.getByPlaceholderText(/Ask your question/i);
    await user.type(input, 'Test{Shift>}{Enter}{/Shift}');
    
    expect(onSendMessage).not.toHaveBeenCalled();
  });

  it('should show stage loading indicators', () => {
    const conversation = {
      id: '1',
      messages: [
        {
          role: 'assistant',
          loading: { stage1: true, stage2: false, stage3: false },
        },
      ],
    };
    render(<ChatInterface {...mockProps} conversation={conversation} />);
    expect(screen.getByText(/Running Stage 1/i)).toBeInTheDocument();
  });
});