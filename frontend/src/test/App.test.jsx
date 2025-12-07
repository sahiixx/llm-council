/**
 * Comprehensive unit tests for App.jsx component.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { api } from '../api';

// Mock the API module
vi.mock('../api', () => ({
  api: {
    listConversations: vi.fn(),
    getConversation: vi.fn(),
    createConversation: vi.fn(),
    sendMessageStream: vi.fn(),
  },
}));

// Mock child components to isolate App logic
vi.mock('../components/Sidebar', () => ({
  default: ({ conversations, currentConversationId, onSelectConversation, onNewConversation }) => (
    <div data-testid="sidebar">
      <button onClick={onNewConversation} data-testid="new-conversation-btn">New</button>
      {conversations.map(conv => (
        <div
          key={conv.id}
          data-testid={`conversation-${conv.id}`}
          onClick={() => onSelectConversation(conv.id)}
          className={conv.id === currentConversationId ? 'active' : ''}
        >
          {conv.title || 'New Conversation'}
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
            onClick={() => onSendMessage('Test message')}
            disabled={isLoading}
            data-testid="send-message-btn"
          >
            Send
          </button>
        </>
      ) : (
        <div data-testid="no-conversation">No conversation</div>
      )}
    </div>
  ),
}));

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial Load', () => {
    it('should render the app', () => {
      api.listConversations.mockResolvedValue([]);
      render(<App />);
      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
      expect(screen.getByTestId('chat-interface')).toBeInTheDocument();
    });

    it('should load conversations on mount', async () => {
      const mockConversations = [
        { id: '1', created_at: '2024-01-01', title: 'Conv 1', message_count: 2 },
        { id: '2', created_at: '2024-01-02', title: 'Conv 2', message_count: 4 },
      ];
      api.listConversations.mockResolvedValue(mockConversations);

      render(<App />);

      await waitFor(() => {
        expect(api.listConversations).toHaveBeenCalledTimes(1);
      });

      expect(screen.getByTestId('conversation-1')).toBeInTheDocument();
      expect(screen.getByTestId('conversation-2')).toBeInTheDocument();
    });

    it('should handle empty conversation list', async () => {
      api.listConversations.mockResolvedValue([]);

      render(<App />);

      await waitFor(() => {
        expect(api.listConversations).toHaveBeenCalled();
      });

      expect(screen.queryByTestId(/^conversation-/)).not.toBeInTheDocument();
    });

    it('should handle API error when loading conversations', async () => {
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
  });

  describe('Creating Conversations', () => {
    it('should create new conversation when button clicked', async () => {
      api.listConversations.mockResolvedValue([]);
      api.createConversation.mockResolvedValue({
        id: 'new-id',
        created_at: '2024-01-01T00:00:00',
        title: 'New Conversation',
        messages: [],
      });

      render(<App />);

      const newBtn = screen.getByTestId('new-conversation-btn');
      await userEvent.click(newBtn);

      await waitFor(() => {
        expect(api.createConversation).toHaveBeenCalled();
      });
    });

    it('should add new conversation to the list', async () => {
      api.listConversations.mockResolvedValue([]);
      api.createConversation.mockResolvedValue({
        id: 'new-id',
        created_at: '2024-01-01T00:00:00',
        title: 'New Conversation',
        messages: [],
      });

      render(<App />);

      await waitFor(() => {
        expect(api.listConversations).toHaveBeenCalled();
      });

      const newBtn = screen.getByTestId('new-conversation-btn');
      await userEvent.click(newBtn);

      await waitFor(() => {
        expect(screen.getByTestId('conversation-new-id')).toBeInTheDocument();
      });
    });

    it('should select newly created conversation', async () => {
      api.listConversations.mockResolvedValue([]);
      api.createConversation.mockResolvedValue({
        id: 'new-id',
        created_at: '2024-01-01T00:00:00',
        title: 'New Conversation',
        messages: [],
      });
      api.getConversation.mockResolvedValue({
        id: 'new-id',
        created_at: '2024-01-01T00:00:00',
        title: 'New Conversation',
        messages: [],
      });

      render(<App />);

      const newBtn = screen.getByTestId('new-conversation-btn');
      await userEvent.click(newBtn);

      await waitFor(() => {
        expect(api.getConversation).toHaveBeenCalledWith('new-id');
      });
    });

    it('should handle error creating conversation', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      api.listConversations.mockResolvedValue([]);
      api.createConversation.mockRejectedValue(new Error('Failed'));

      render(<App />);

      const newBtn = screen.getByTestId('new-conversation-btn');
      await userEvent.click(newBtn);

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          'Failed to create conversation:',
          expect.any(Error)
        );
      });

      consoleError.mockRestore();
    });
  });

  describe('Selecting Conversations', () => {
    it('should load conversation details when selected', async () => {
      const mockConversations = [
        { id: 'conv-1', created_at: '2024-01-01', title: 'Conv 1', message_count: 2 },
      ];
      const mockConversation = {
        id: 'conv-1',
        created_at: '2024-01-01',
        title: 'Conv 1',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      api.listConversations.mockResolvedValue(mockConversations);
      api.getConversation.mockResolvedValue(mockConversation);

      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('conversation-conv-1')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByTestId('conversation-conv-1'));

      await waitFor(() => {
        expect(api.getConversation).toHaveBeenCalledWith('conv-1');
        expect(screen.getByTestId('conversation-title')).toHaveTextContent('Conv 1');
      });
    });

    it('should handle error loading conversation', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      const mockConversations = [
        { id: 'conv-1', created_at: '2024-01-01', title: 'Conv 1', message_count: 2 },
      ];

      api.listConversations.mockResolvedValue(mockConversations);
      api.getConversation.mockRejectedValue(new Error('Failed'));

      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('conversation-conv-1')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByTestId('conversation-conv-1'));

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          'Failed to load conversation:',
          expect.any(Error)
        );
      });

      consoleError.mockRestore();
    });
  });

  describe('Sending Messages', () => {
    it('should send message and update UI optimistically', async () => {
      const mockConversation = {
        id: 'conv-1',
        created_at: '2024-01-01',
        title: 'Test Conv',
        messages: [],
      };

      api.listConversations.mockResolvedValue([]);
      api.getConversation.mockResolvedValue(mockConversation);
      api.sendMessageStream.mockImplementation(async (id, content, callback) => {
        callback('stage1_start', { type: 'stage1_start' });
        callback('stage1_complete', { type: 'stage1_complete', data: [] });
        callback('stage2_start', { type: 'stage2_start' });
        callback('stage2_complete', { type: 'stage2_complete', data: [], metadata: {} });
        callback('stage3_start', { type: 'stage3_start' });
        callback('stage3_complete', { type: 'stage3_complete', data: {} });
        callback('complete', { type: 'complete' });
      });

      render(<App />);

      // Create and select conversation
      api.createConversation.mockResolvedValue(mockConversation);
      await userEvent.click(screen.getByTestId('new-conversation-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('send-message-btn')).toBeInTheDocument();
      });

      // Send message
      await userEvent.click(screen.getByTestId('send-message-btn'));

      await waitFor(() => {
        expect(api.sendMessageStream).toHaveBeenCalled();
      });
    });

    it('should set loading state while sending', async () => {
      const mockConversation = {
        id: 'conv-1',
        created_at: '2024-01-01',
        title: 'Test',
        messages: [],
      };

      api.listConversations.mockResolvedValue([]);
      api.getConversation.mockResolvedValue(mockConversation);
      api.createConversation.mockResolvedValue(mockConversation);
      api.sendMessageStream.mockImplementation(async (id, content, callback) => {
        // Simulate delay
        await new Promise(resolve => setTimeout(resolve, 100));
        callback('complete', { type: 'complete' });
      });

      render(<App />);

      await userEvent.click(screen.getByTestId('new-conversation-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('send-message-btn')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByTestId('send-message-btn'));

      // Check button is disabled during loading
      expect(screen.getByTestId('send-message-btn')).toBeDisabled();
    });

    it('should handle streaming events progressively', async () => {
      const mockConversation = {
        id: 'conv-1',
        created_at: '2024-01-01',
        title: 'Test',
        messages: [],
      };

      api.listConversations.mockResolvedValue([]);
      api.getConversation.mockResolvedValue(mockConversation);
      api.createConversation.mockResolvedValue(mockConversation);

      let eventCallback;
      api.sendMessageStream.mockImplementation(async (id, content, callback) => {
        eventCallback = callback;
      });

      render(<App />);

      await userEvent.click(screen.getByTestId('new-conversation-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('send-message-btn')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByTestId('send-message-btn'));

      await waitFor(() => {
        expect(eventCallback).toBeDefined();
      });

      // Simulate stage events
      eventCallback('stage1_start', { type: 'stage1_start' });
      eventCallback('stage1_complete', { 
        type: 'stage1_complete', 
        data: [{ model: 'm1', response: 'R1' }] 
      });
      eventCallback('complete', { type: 'complete' });
    });

    it('should reload conversations on completion', async () => {
      const mockConversation = {
        id: 'conv-1',
        created_at: '2024-01-01',
        title: 'Test',
        messages: [],
      };

      api.listConversations.mockResolvedValue([]);
      api.getConversation.mockResolvedValue(mockConversation);
      api.createConversation.mockResolvedValue(mockConversation);
      api.sendMessageStream.mockImplementation(async (id, content, callback) => {
        callback('complete', { type: 'complete' });
      });

      render(<App />);

      await userEvent.click(screen.getByTestId('new-conversation-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('send-message-btn')).toBeInTheDocument();
      });

      // Clear previous calls
      api.listConversations.mockClear();

      await userEvent.click(screen.getByTestId('send-message-btn'));

      await waitFor(() => {
        expect(api.listConversations).toHaveBeenCalled();
      });
    });

    it('should handle error during message sending', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      const mockConversation = {
        id: 'conv-1',
        created_at: '2024-01-01',
        title: 'Test',
        messages: [],
      };

      api.listConversations.mockResolvedValue([]);
      api.getConversation.mockResolvedValue(mockConversation);
      api.createConversation.mockResolvedValue(mockConversation);
      api.sendMessageStream.mockRejectedValue(new Error('Network error'));

      render(<App />);

      await userEvent.click(screen.getByTestId('new-conversation-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('send-message-btn')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByTestId('send-message-btn'));

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          'Failed to send message:',
          expect.any(Error)
        );
      });

      consoleError.mockRestore();
    });

    it('should handle stream error event', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      const mockConversation = {
        id: 'conv-1',
        created_at: '2024-01-01',
        title: 'Test',
        messages: [],
      };

      api.listConversations.mockResolvedValue([]);
      api.getConversation.mockResolvedValue(mockConversation);
      api.createConversation.mockResolvedValue(mockConversation);
      api.sendMessageStream.mockImplementation(async (id, content, callback) => {
        callback('error', { type: 'error', message: 'Stream error' });
      });

      render(<App />);

      await userEvent.click(screen.getByTestId('new-conversation-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('send-message-btn')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByTestId('send-message-btn'));

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith('Stream error:', 'Stream error');
      });

      consoleError.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    it('should not send message without conversation selected', async () => {
      api.listConversations.mockResolvedValue([]);

      render(<App />);

      await waitFor(() => {
        expect(api.listConversations).toHaveBeenCalled();
      });

      expect(screen.getByTestId('no-conversation')).toBeInTheDocument();
    });

    it('should handle rapid conversation switching', async () => {
      const mockConversations = [
        { id: 'conv-1', created_at: '2024-01-01', title: 'Conv 1', message_count: 2 },
        { id: 'conv-2', created_at: '2024-01-02', title: 'Conv 2', message_count: 3 },
      ];

      api.listConversations.mockResolvedValue(mockConversations);
      api.getConversation.mockImplementation(async (id) => ({
        id,
        created_at: '2024-01-01',
        title: `Conv ${id}`,
        messages: [],
      }));

      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('conversation-conv-1')).toBeInTheDocument();
      });

      // Rapidly switch between conversations
      await userEvent.click(screen.getByTestId('conversation-conv-1'));
      await userEvent.click(screen.getByTestId('conversation-conv-2'));

      await waitFor(() => {
        expect(api.getConversation).toHaveBeenCalledWith('conv-2');
      });
    });
  });
});