import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { api } from '../api';

vi.mock('../api', () => ({
  api: {
    listConversations: vi.fn(),
    getConversation: vi.fn(),
    createConversation: vi.fn(),
    sendMessageStream: vi.fn(),
  },
}));

vi.mock('../components/Sidebar', () => ({
  default: ({ conversations, currentConversationId, onSelectConversation, onNewConversation }) => (
    <div data-testid="sidebar">
      <button onClick={onNewConversation} data-testid="new-conversation-btn">New</button>
      {conversations.map((conv) => (
        <div
          key={conv.id}
          data-testid={`conversation-${conv.id}`}
          onClick={() => onSelectConversation(conv.id)}
        >
          {conv.title}
        </div>
      ))}
    </div>
  ),
}));

vi.mock('../components/ChatInterface', () => ({
  default: ({ conversation, onSendMessage, isLoading }) => (
    <div data-testid="chat-interface">
      <div data-testid="conversation-title">{conversation?.title || 'No conversation'}</div>
      <button onClick={() => onSendMessage('Test')} data-testid="send-btn">Send</button>
      {isLoading && <div data-testid="loading">Loading</div>}
    </div>
  ),
}));

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders and loads conversations', async () => {
    api.listConversations.mockResolvedValue([]);
    render(<App />);
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    await waitFor(() => expect(api.listConversations).toHaveBeenCalled());
  });

  it('creates new conversation', async () => {
    const newConv = { id: 'new', created_at: '2024-01-01', messages: [] };
    api.listConversations.mockResolvedValue([]);
    api.createConversation.mockResolvedValue(newConv);
    api.getConversation.mockResolvedValue(newConv);

    render(<App />);
    await userEvent.click(screen.getByTestId('new-conversation-btn'));

    await waitFor(() => expect(api.createConversation).toHaveBeenCalled());
  });

  it('sends message with streaming', async () => {
    const conv = { id: 'test', title: 'Test', messages: [] };
    api.listConversations.mockResolvedValue([{ id: 'test', title: 'Test', message_count: 0 }]);
    api.createConversation.mockResolvedValue(conv);
    api.getConversation.mockResolvedValue(conv);
    api.sendMessageStream.mockImplementation((id, content, callback) => {
      callback('complete', {});
      return Promise.resolve();
    });

    render(<App />);
    await userEvent.click(screen.getByTestId('new-conversation-btn'));
    await waitFor(() => screen.getByTestId('send-btn'));
    await userEvent.click(screen.getByTestId('send-btn'));

    await waitFor(() => expect(api.sendMessageStream).toHaveBeenCalled());
  });
});