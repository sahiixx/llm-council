/**
 * Comprehensive unit tests for frontend/src/components/ChatInterface.jsx
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChatInterface from './ChatInterface';

describe('ChatInterface Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show empty state when no conversation', () => {
    render(
      <ChatInterface
        conversation={null}
        onSendMessage={vi.fn()}
        isLoading={false}
      />
    );

    expect(screen.getByText('Welcome to LLM Council')).toBeInTheDocument();
    expect(screen.getByText('Create a new conversation to get started')).toBeInTheDocument();
  });

  it('should show start conversation state when conversation empty', () => {
    const conversation = {
      id: '1',
      title: 'Test',
      messages: [],
    };

    render(
      <ChatInterface
        conversation={conversation}
        onSendMessage={vi.fn()}
        isLoading={false}
      />
    );

    expect(screen.getByText('Start a conversation')).toBeInTheDocument();
  });

  it('should render message input when conversation exists', () => {
    const conversation = {
      id: '1',
      title: 'Test',
      messages: [],
    };

    render(
      <ChatInterface
        conversation={conversation}
        onSendMessage={vi.fn()}
        isLoading={false}
      />
    );

    expect(screen.getByPlaceholderText(/Ask your question/i)).toBeInTheDocument();
  });

  it('should call onSendMessage when send button clicked', async () => {
    const handleSend = vi.fn();
    const conversation = {
      id: '1',
      title: 'Test',
      messages: [],
    };

    render(
      <ChatInterface
        conversation={conversation}
        onSendMessage={handleSend}
        isLoading={false}
      />
    );

    const textarea = screen.getByPlaceholderText(/Ask your question/i);
    await userEvent.type(textarea, 'Test question');

    const sendButton = screen.getByText('Send');
    await userEvent.click(sendButton);

    expect(handleSend).toHaveBeenCalledWith('Test question');
  });

  it('should clear input after sending', async () => {
    const conversation = {
      id: '1',
      title: 'Test',
      messages: [],
    };

    render(
      <ChatInterface
        conversation={conversation}
        onSendMessage={vi.fn()}
        isLoading={false}
      />
    );

    const textarea = screen.getByPlaceholderText(/Ask your question/i);
    await userEvent.type(textarea, 'Test question');
    
    const sendButton = screen.getByText('Send');
    await userEvent.click(sendButton);

    expect(textarea).toHaveValue('');
  });

  it('should submit on Enter key', async () => {
    const handleSend = vi.fn();
    const conversation = {
      id: '1',
      title: 'Test',
      messages: [],
    };

    render(
      <ChatInterface
        conversation={conversation}
        onSendMessage={handleSend}
        isLoading={false}
      />
    );

    const textarea = screen.getByPlaceholderText(/Ask your question/i);
    await userEvent.type(textarea, 'Test question{Enter}');

    expect(handleSend).toHaveBeenCalledWith('Test question');
  });

  it('should not submit on Shift+Enter', async () => {
    const handleSend = vi.fn();
    const conversation = {
      id: '1',
      title: 'Test',
      messages: [],
    };

    render(
      <ChatInterface
        conversation={conversation}
        onSendMessage={handleSend}
        isLoading={false}
      />
    );

    const textarea = screen.getByPlaceholderText(/Ask your question/i);
    await userEvent.type(textarea, 'Line 1{Shift>}{Enter}{/Shift}Line 2');

    expect(handleSend).not.toHaveBeenCalled();
    expect(textarea).toHaveValue('Line 1\nLine 2');
  });

  it('should disable send button when input empty', () => {
    const conversation = {
      id: '1',
      title: 'Test',
      messages: [],
    };

    render(
      <ChatInterface
        conversation={conversation}
        onSendMessage={vi.fn()}
        isLoading={false}
      />
    );

    const sendButton = screen.getByText('Send');
    expect(sendButton).toBeDisabled();
  });

  it('should disable send button when loading', () => {
    const conversation = {
      id: '1',
      title: 'Test',
      messages: [],
    };

    render(
      <ChatInterface
        conversation={conversation}
        onSendMessage={vi.fn()}
        isLoading={true}
      />
    );

    const sendButton = screen.getByText('Send');
    expect(sendButton).toBeDisabled();
  });

  it('should render user messages', () => {
    const conversation = {
      id: '1',
      title: 'Test',
      messages: [
        { role: 'user', content: 'Hello, council!' },
      ],
    };

    render(
      <ChatInterface
        conversation={conversation}
        onSendMessage={vi.fn()}
        isLoading={false}
      />
    );

    expect(screen.getByText('You')).toBeInTheDocument();
    expect(screen.getByText('Hello, council!')).toBeInTheDocument();
  });

  it('should render assistant messages with stages', () => {
    const conversation = {
      id: '1',
      title: 'Test',
      messages: [
        {
          role: 'assistant',
          stage1: [{ model: 'model1', response: 'Response 1' }],
          stage2: [{ model: 'model1', ranking: 'Ranking' }],
          stage3: { model: 'chairman', response: 'Final answer' },
        },
      ],
    };

    render(
      <ChatInterface
        conversation={conversation}
        onSendMessage={vi.fn()}
        isLoading={false}
      />
    );

    expect(screen.getByText('LLM Council')).toBeInTheDocument();
  });

  it('should show loading indicators for stages', () => {
    const conversation = {
      id: '1',
      title: 'Test',
      messages: [
        {
          role: 'assistant',
          loading: {
            stage1: true,
            stage2: false,
            stage3: false,
          },
        },
      ],
    };

    render(
      <ChatInterface
        conversation={conversation}
        onSendMessage={vi.fn()}
        isLoading={false}
      />
    );

    expect(screen.getByText(/Running Stage 1/i)).toBeInTheDocument();
  });

  it('should show loading indicator when isLoading true', () => {
    const conversation = {
      id: '1',
      title: 'Test',
      messages: [],
    };

    render(
      <ChatInterface
        conversation={conversation}
        onSendMessage={vi.fn()}
        isLoading={true}
      />
    );

    expect(screen.getByText(/Consulting the council/i)).toBeInTheDocument();
  });

  it('should not submit with only whitespace', async () => {
    const handleSend = vi.fn();
    const conversation = {
      id: '1',
      title: 'Test',
      messages: [],
    };

    render(
      <ChatInterface
        conversation={conversation}
        onSendMessage={handleSend}
        isLoading={false}
      />
    );

    const textarea = screen.getByPlaceholderText(/Ask your question/i);
    await userEvent.type(textarea, '   ');
    
    const sendButton = screen.getByText('Send');
    await userEvent.click(sendButton);

    expect(handleSend).not.toHaveBeenCalled();
  });

  it('should hide input form when messages exist', () => {
    const conversation = {
      id: '1',
      title: 'Test',
      messages: [
        { role: 'user', content: 'Existing message' },
      ],
    };

    render(
      <ChatInterface
        conversation={conversation}
        onSendMessage={vi.fn()}
        isLoading={false}
      />
    );

    // Input should not be visible when messages exist
    expect(screen.queryByPlaceholderText(/Ask your question/i)).not.toBeInTheDocument();
  });
});