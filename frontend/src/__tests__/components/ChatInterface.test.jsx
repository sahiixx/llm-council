/**
 * Comprehensive unit tests for ChatInterface component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ChatInterface from '../../components/ChatInterface';

describe('ChatInterface', () => {
  const mockOnSendMessage = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show empty state when no conversation', () => {
    render(<ChatInterface conversation={null} onSendMessage={mockOnSendMessage} isLoading={false} />);
    
    expect(screen.getByText('Welcome to LLM Council')).toBeInTheDocument();
    expect(screen.getByText('Create a new conversation to get started')).toBeInTheDocument();
  });

  it('should show start conversation message for empty conversation', () => {
    const emptyConv = {
      id: '1',
      messages: [],
    };

    render(<ChatInterface conversation={emptyConv} onSendMessage={mockOnSendMessage} isLoading={false} />);
    
    expect(screen.getByText('Start a conversation')).toBeInTheDocument();
    expect(screen.getByText('Ask a question to consult the LLM Council')).toBeInTheDocument();
  });

  it('should render user messages', () => {
    const conversation = {
      id: '1',
      messages: [
        { role: 'user', content: 'Hello, council!' },
      ],
    };

    render(<ChatInterface conversation={conversation} onSendMessage={mockOnSendMessage} isLoading={false} />);
    
    expect(screen.getByText('Hello, council!')).toBeInTheDocument();
    expect(screen.getByText('You')).toBeInTheDocument();
  });

  it('should render assistant messages with all stages', () => {
    const conversation = {
      id: '1',
      messages: [
        {
          role: 'assistant',
          stage1: [{ model: 'model1', response: 'Response 1' }],
          stage2: [{ model: 'model1', ranking: 'Ranking' }],
          stage3: { model: 'chairman', response: 'Final answer' },
          metadata: {
            label_to_model: {},
            aggregate_rankings: [],
          },
        },
      ],
    };

    render(<ChatInterface conversation={conversation} onSendMessage={mockOnSendMessage} isLoading={false} />);
    
    expect(screen.getByText('LLM Council')).toBeInTheDocument();
  });

  it('should show loading indicator for stage1', () => {
    const conversation = {
      id: '1',
      messages: [
        {
          role: 'assistant',
          loading: { stage1: true, stage2: false, stage3: false },
        },
      ],
    };

    render(<ChatInterface conversation={conversation} onSendMessage={mockOnSendMessage} isLoading={false} />);
    
    expect(screen.getByText(/Running Stage 1/i)).toBeInTheDocument();
  });

  it('should show loading indicator for stage2', () => {
    const conversation = {
      id: '1',
      messages: [
        {
          role: 'assistant',
          stage1: [],
          loading: { stage1: false, stage2: true, stage3: false },
        },
      ],
    };

    render(<ChatInterface conversation={conversation} onSendMessage={mockOnSendMessage} isLoading={false} />);
    
    expect(screen.getByText(/Running Stage 2/i)).toBeInTheDocument();
  });

  it('should show loading indicator for stage3', () => {
    const conversation = {
      id: '1',
      messages: [
        {
          role: 'assistant',
          stage1: [],
          stage2: [],
          loading: { stage1: false, stage2: false, stage3: true },
        },
      ],
    };

    render(<ChatInterface conversation={conversation} onSendMessage={mockOnSendMessage} isLoading={false} />);
    
    expect(screen.getByText(/Running Stage 3/i)).toBeInTheDocument();
  });

  it('should handle message input and submission', async () => {
    const emptyConv = {
      id: '1',
      messages: [],
    };

    render(<ChatInterface conversation={emptyConv} onSendMessage={mockOnSendMessage} isLoading={false} />);
    
    const textarea = screen.getByPlaceholderText(/Ask your question/i);
    const sendButton = screen.getByText('Send');

    fireEvent.change(textarea, { target: { value: 'Test message' } });
    fireEvent.click(sendButton);

    expect(mockOnSendMessage).toHaveBeenCalledWith('Test message');
  });

  it('should handle Enter key to submit', async () => {
    const emptyConv = {
      id: '1',
      messages: [],
    };

    render(<ChatInterface conversation={emptyConv} onSendMessage={mockOnSendMessage} isLoading={false} />);
    
    const textarea = screen.getByPlaceholderText(/Ask your question/i);

    fireEvent.change(textarea, { target: { value: 'Test message' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

    expect(mockOnSendMessage).toHaveBeenCalledWith('Test message');
  });

  it('should not submit on Shift+Enter', () => {
    const emptyConv = {
      id: '1',
      messages: [],
    };

    render(<ChatInterface conversation={emptyConv} onSendMessage={mockOnSendMessage} isLoading={false} />);
    
    const textarea = screen.getByPlaceholderText(/Ask your question/i);

    fireEvent.change(textarea, { target: { value: 'Test message' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });

    expect(mockOnSendMessage).not.toHaveBeenCalled();
  });

  it('should clear input after submission', () => {
    const emptyConv = {
      id: '1',
      messages: [],
    };

    render(<ChatInterface conversation={emptyConv} onSendMessage={mockOnSendMessage} isLoading={false} />);
    
    const textarea = screen.getByPlaceholderText(/Ask your question/i);
    const sendButton = screen.getByText('Send');

    fireEvent.change(textarea, { target: { value: 'Test message' } });
    fireEvent.click(sendButton);

    expect(textarea.value).toBe('');
  });

  it('should disable input when loading', () => {
    const emptyConv = {
      id: '1',
      messages: [],
    };

    render(<ChatInterface conversation={emptyConv} onSendMessage={mockOnSendMessage} isLoading={true} />);
    
    const textarea = screen.getByPlaceholderText(/Ask your question/i);
    const sendButton = screen.getByText('Send');

    expect(textarea).toBeDisabled();
    expect(sendButton).toBeDisabled();
  });

  it('should not submit empty messages', () => {
    const emptyConv = {
      id: '1',
      messages: [],
    };

    render(<ChatInterface conversation={emptyConv} onSendMessage={mockOnSendMessage} isLoading={false} />);
    
    const sendButton = screen.getByText('Send');

    fireEvent.click(sendButton);

    expect(mockOnSendMessage).not.toHaveBeenCalled();
  });

  it('should not submit whitespace-only messages', () => {
    const emptyConv = {
      id: '1',
      messages: [],
    };

    render(<ChatInterface conversation={emptyConv} onSendMessage={mockOnSendMessage} isLoading={false} />);
    
    const textarea = screen.getByPlaceholderText(/Ask your question/i);
    const sendButton = screen.getByText('Send');

    fireEvent.change(textarea, { target: { value: '   ' } });
    fireEvent.click(sendButton);

    expect(mockOnSendMessage).not.toHaveBeenCalled();
  });

  it('should show global loading indicator', () => {
    const conversation = {
      id: '1',
      messages: [],
    };

    render(<ChatInterface conversation={conversation} onSendMessage={mockOnSendMessage} isLoading={true} />);
    
    expect(screen.getByText(/Consulting the council/i)).toBeInTheDocument();
  });

  it('should render multiple messages in conversation', () => {
    const conversation = {
      id: '1',
      messages: [
        { role: 'user', content: 'First question' },
        {
          role: 'assistant',
          stage1: [],
          stage2: [],
          stage3: { model: 'chairman', response: 'First answer' },
        },
        { role: 'user', content: 'Second question' },
      ],
    };

    render(<ChatInterface conversation={conversation} onSendMessage={mockOnSendMessage} isLoading={false} />);
    
    expect(screen.getByText('First question')).toBeInTheDocument();
    expect(screen.getByText('Second question')).toBeInTheDocument();
  });

  it('should only show input form for first message', () => {
    const emptyConv = {
      id: '1',
      messages: [],
    };

    const { rerender } = render(
      <ChatInterface conversation={emptyConv} onSendMessage={mockOnSendMessage} isLoading={false} />
    );
    
    expect(screen.getByPlaceholderText(/Ask your question/i)).toBeInTheDocument();

    const convWithMessages = {
      id: '1',
      messages: [{ role: 'user', content: 'First' }],
    };

    rerender(<ChatInterface conversation={convWithMessages} onSendMessage={mockOnSendMessage} isLoading={false} />);
    
    expect(screen.queryByPlaceholderText(/Ask your question/i)).not.toBeInTheDocument();
  });
});