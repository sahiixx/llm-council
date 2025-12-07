/**
 * Comprehensive unit tests for App.jsx
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { api } from '../api';

// Mock the api module
vi.mock('../api', () => ({
  api: {
    listConversations: vi.fn(),
    createConversation: vi.fn(),
    getConversation: vi.fn(),
    sendMessageStream: vi.fn(),
  },
}));

// Mock child components to isolate App logic
vi.mock('../components/Sidebar', () => ({
  default: ({ conversations, currentConversationId, onSelectConversation, onNewConversation }) => (
    <div data-testid="sidebar">
      <button onClick={onNewConversation} data-testid="new-conversation-btn">
        New Conversation
      </button>
      {conversations.map((conv) => (
        <div
          key={conv.id}
          data-testid={`conversation-${conv.id}`}
          onClick={() => onSelectConversation(conv.id)}
          className={conv.id === currentConversationId ? 'active' : ''}
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
      {conversation ? (
        <>
          <div data-testid="conversation-title">{conversation.title}</div>
          <button
            onClick={() => onSendMessage('test message')}
            disabled={isLoading}
            data-testid="send-message-btn"
          >
            Send
          </button>
          {isLoading && <div data-testid="loading">Loading...</div>}
        </>
      ) : (
        <div data-testid="no-conversation">No conversation selected</div>
      )}
    </div>
  ),
}));

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('renders without crashing', () => {
      api.listConversations.mockResolvedValue([]);
      render(<App />);
      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
      expect(screen.getByTestId('chat-interface')).toBeInTheDocument();
    });

    it('loads conversations on mount', async () => {
      const mockConversations = [
        { id: '1', title: 'Conv 1', created_at: '2024-01-01', message_count: 2 },
        { id: '2', title: 'Conv 2', created_at: '2024-01-02', message_count: 1 },
      ];
      api.listConversations.mockResolvedValue(mockConversations);

      render(<App />);

      await waitFor(() => {
        expect(api.listConversations).toHaveBeenCalledTimes(1);
      });

      expect(screen.getByText('Conv 1')).toBeInTheDocument();
      expect(screen.getByText('Conv 2')).toBeInTheDocument();
    });

    it('displays no conversation selected initially', () => {
      api.listConversations.mockResolvedValue([]);
      render(<App />);
      expect(screen.getByTestId('no-conversation')).toBeInTheDocument();
    });
  });

  describe('Conversation Management', () => {
    it('creates a new conversation when button is clicked', async () => {
      const user = userEvent.setup();
      const newConv = {
        id: 'new-id',
        title: 'New Conversation',
        created_at: '2024-01-01',
        messages: [],
      };

      api.listConversations.mockResolvedValue([]);
      api.createConversation.mockResolvedValue(newConv);
      api.getConversation.mockResolvedValue(newConv);

      render(<App />);

      await user.click(screen.getByTestId('new-conversation-btn'));

      await waitFor(() => {
        expect(api.createConversation).toHaveBeenCalledTimes(1);
      });
    });

    it('selects a conversation when clicked', async () => {
      const user = userEvent.setup();
      const conversations = [
        { id: 'conv-1', title: 'Conversation 1', created_at: '2024-01-01', message_count: 1 },
      ];
      const fullConv = {
        id: 'conv-1',
        title: 'Conversation 1',
        created_at: '2024-01-01',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      api.listConversations.mockResolvedValue(conversations);
      api.getConversation.mockResolvedValue(fullConv);

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Conversation 1')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('conversation-conv-1'));

      await waitFor(() => {
        expect(api.getConversation).toHaveBeenCalledWith('conv-1');
      });

      expect(screen.getByTestId('conversation-title')).toHaveTextContent('Conversation 1');
    });

    it('loads full conversation details when selected', async () => {
      const user = userEvent.setup();
      const conversations = [{ id: 'conv-1', title: 'Conv 1', created_at: '2024-01-01', message_count: 1 }];
      const fullConv = {
        id: 'conv-1',
        title: 'Conv 1',
        created_at: '2024-01-01',
        messages: [
          { role: 'user', content: 'Question' },
          { role: 'assistant', stage1: [], stage2: [], stage3: {} },
        ],
      };

      api.listConversations.mockResolvedValue(conversations);
      api.getConversation.mockResolvedValue(fullConv);

      render(<App />);

      await waitFor(() => screen.getByText('Conv 1'));
      await user.click(screen.getByTestId('conversation-conv-1'));

      await waitFor(() => {
        expect(api.getConversation).toHaveBeenCalledWith('conv-1');
      });
    });
  });

  describe('Message Sending', () => {
    it('sends a message through streaming API', async () => {
      const user = userEvent.setup();
      const conversation = {
        id: 'conv-1',
        title: 'Test Conv',
        created_at: '2024-01-01',
        messages: [],
      };

      api.listConversations.mockResolvedValue([]);
      api.getConversation.mockResolvedValue(conversation);
      api.sendMessageStream.mockImplementation(async (convId, content, callback) => {
        callback('stage1_start', { type: 'stage1_start' });
        callback('stage1_complete', {
          type: 'stage1_complete',
          data: [{ model: 'm1', response: 'R1' }],
        });
        callback('complete', { type: 'complete' });
      });

      render(<App />);

      // First create/select a conversation
      const newConv = {
        id: 'test-conv',
        title: 'New Conversation',
        created_at: '2024-01-01',
        messages: [],
      };
      api.createConversation.mockResolvedValue(newConv);
      api.getConversation.mockResolvedValue(newConv);

      await user.click(screen.getByTestId('new-conversation-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('send-message-btn')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('send-message-btn'));

      await waitFor(() => {
        expect(api.sendMessageStream).toHaveBeenCalled();
      });
    });

    it('shows loading state while processing message', async () => {
      const user = userEvent.setup();
      let resolveStream;
      const streamPromise = new Promise((resolve) => {
        resolveStream = resolve;
      });

      api.listConversations.mockResolvedValue([]);
      api.createConversation.mockResolvedValue({
        id: 'conv-1',
        title: 'New',
        created_at: '2024-01-01',
        messages: [],
      });
      api.getConversation.mockResolvedValue({
        id: 'conv-1',
        title: 'New',
        messages: [],
      });
      api.sendMessageStream.mockImplementation(async () => {
        await streamPromise;
      });

      render(<App />);

      await user.click(screen.getByTestId('new-conversation-btn'));
      await waitFor(() => screen.getByTestId('send-message-btn'));

      await user.click(screen.getByTestId('send-message-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toBeInTheDocument();
      });

      resolveStream();
    });

    it('handles streaming events progressively', async () => {
      const user = userEvent.setup();

      api.listConversations.mockResolvedValue([]);
      api.createConversation.mockResolvedValue({
        id: 'conv-1',
        title: 'New',
        created_at: '2024-01-01',
        messages: [],
      });
      api.getConversation.mockResolvedValue({
        id: 'conv-1',
        title: 'New',
        messages: [],
      });

      api.sendMessageStream.mockImplementation(async (convId, content, callback) => {
        callback('stage1_start', { type: 'stage1_start' });
        callback('stage1_complete', {
          type: 'stage1_complete',
          data: [{ model: 'm1', response: 'Response 1' }],
        });
        callback('stage2_start', { type: 'stage2_start' });
        callback('stage2_complete', {
          type: 'stage2_complete',
          data: [{ model: 'm1', ranking: 'Ranking' }],
          metadata: { label_to_model: {}, aggregate_rankings: [] },
        });
        callback('stage3_start', { type: 'stage3_start' });
        callback('stage3_complete', {
          type: 'stage3_complete',
          data: { model: 'chairman', response: 'Final' },
        });
        callback('complete', { type: 'complete' });
      });

      render(<App />);

      await user.click(screen.getByTestId('new-conversation-btn'));
      await waitFor(() => screen.getByTestId('send-message-btn'));
      await user.click(screen.getByTestId('send-message-btn'));

      await waitFor(() => {
        expect(api.sendMessageStream).toHaveBeenCalled();
      });
    });

    it('reloads conversations on title_complete event', async () => {
      api.listConversations.mockResolvedValue([]);
      api.createConversation.mockResolvedValue({
        id: 'conv-1',
        title: 'New',
        created_at: '2024-01-01',
        messages: [],
      });
      api.getConversation.mockResolvedValue({
        id: 'conv-1',
        title: 'New',
        messages: [],
      });
      api.sendMessageStream.mockImplementation(async (convId, content, callback) => {
        callback('title_complete', {
          type: 'title_complete',
          data: { title: 'Generated Title' },
        });
        callback('complete', { type: 'complete' });
      });

      const user = userEvent.setup();
      render(<App />);

      await user.click(screen.getByTestId('new-conversation-btn'));
      await waitFor(() => screen.getByTestId('send-message-btn'));

      const initialCallCount = api.listConversations.mock.calls.length;

      await user.click(screen.getByTestId('send-message-btn'));

      await waitFor(() => {
        expect(api.listConversations.mock.calls.length).toBeGreaterThan(initialCallCount);
      });
    });
  });

  describe('Error Handling', () => {
    it('handles conversation loading errors gracefully', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      api.listConversations.mockRejectedValue(new Error('Network error'));

      render(<App />);

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          'Failed to load conversations:',
          expect.any(Error)
        );
      });

      consoleError.mockRestore();
    });

    it('handles conversation creation errors', async () => {
      const user = userEvent.setup();
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      api.listConversations.mockResolvedValue([]);
      api.createConversation.mockRejectedValue(new Error('Creation failed'));

      render(<App />);

      await user.click(screen.getByTestId('new-conversation-btn'));

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          'Failed to create conversation:',
          expect.any(Error)
        );
      });

      consoleError.mockRestore();
    });

    it('handles message sending errors', async () => {
      const user = userEvent.setup();
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      api.listConversations.mockResolvedValue([]);
      api.createConversation.mockResolvedValue({
        id: 'conv-1',
        title: 'New',
        created_at: '2024-01-01',
        messages: [],
      });
      api.getConversation.mockResolvedValue({
        id: 'conv-1',
        title: 'New',
        messages: [],
      });
      api.sendMessageStream.mockRejectedValue(new Error('Stream failed'));

      render(<App />);

      await user.click(screen.getByTestId('new-conversation-btn'));
      await waitFor(() => screen.getByTestId('send-message-btn'));
      await user.click(screen.getByTestId('send-message-btn'));

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          'Failed to send message:',
          expect.any(Error)
        );
      });

      consoleError.mockRestore();
    });

    it('handles stream errors from error event', async () => {
      const user = userEvent.setup();
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      api.listConversations.mockResolvedValue([]);
      api.createConversation.mockResolvedValue({
        id: 'conv-1',
        title: 'New',
        created_at: '2024-01-01',
        messages: [],
      });
      api.getConversation.mockResolvedValue({
        id: 'conv-1',
        title: 'New',
        messages: [],
      });
      api.sendMessageStream.mockImplementation(async (convId, content, callback) => {
        callback('error', { type: 'error', message: 'Stream error occurred' });
      });

      render(<App />);

      await user.click(screen.getByTestId('new-conversation-btn'));
      await waitFor(() => screen.getByTestId('send-message-btn'));
      await user.click(screen.getByTestId('send-message-btn'));

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith('Stream error:', 'Stream error occurred');
      });

      consoleError.mockRestore();
    });
  });

  describe('State Management', () => {
    it('updates conversation list after creating new conversation', async () => {
      const user = userEvent.setup();
      const initialConvs = [{ id: '1', title: 'Old', created_at: '2024-01-01', message_count: 0 }];
      const newConv = {
        id: 'new',
        title: 'New Conversation',
        created_at: '2024-01-02',
        messages: [],
      };

      api.listConversations.mockResolvedValue(initialConvs);
      api.createConversation.mockResolvedValue(newConv);
      api.getConversation.mockResolvedValue(newConv);

      render(<App />);

      await waitFor(() => screen.getByText('Old'));

      await user.click(screen.getByTestId('new-conversation-btn'));

      await waitFor(() => {
        expect(api.createConversation).toHaveBeenCalled();
      });
    });

    it('maintains separate state for conversations list and current conversation', async () => {
      const user = userEvent.setup();
      const conversations = [
        { id: '1', title: 'Conv 1', created_at: '2024-01-01', message_count: 2 },
        { id: '2', title: 'Conv 2', created_at: '2024-01-02', message_count: 1 },
      ];

      api.listConversations.mockResolvedValue(conversations);
      api.getConversation.mockImplementation((id) =>
        Promise.resolve({
          id,
          title: `Conv ${id}`,
          created_at: '2024-01-01',
          messages: [],
        })
      );

      render(<App />);

      await waitFor(() => screen.getByText('Conv 1'));

      await user.click(screen.getByTestId('conversation-1'));
      await waitFor(() => screen.getByTestId('conversation-title'));
      expect(screen.getByTestId('conversation-title')).toHaveTextContent('Conv 1');

      await user.click(screen.getByTestId('conversation-2'));
      await waitFor(() => {
        expect(screen.getByTestId('conversation-title')).toHaveTextContent('Conv 2');
      });
    });
  });
});