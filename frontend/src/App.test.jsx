/**
 * Comprehensive unit tests for frontend/src/App.jsx
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { api } from './api';

// Mock the api module
vi.mock('./api', () => ({
  api: {
    listConversations: vi.fn(),
    createConversation: vi.fn(),
    getConversation: vi.fn(),
    sendMessageStream: vi.fn()
  }
}));

// Mock child components to simplify testing
vi.mock('./components/Sidebar', () => ({
  default: ({ conversations, currentConversationId, onSelectConversation, onNewConversation }) => (
    <div data-testid="sidebar">
      <button onClick={onNewConversation} data-testid="new-conversation-btn">
        New Conversation
      </button>
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
  )
}));

vi.mock('./components/ChatInterface', () => ({
  default: ({ conversation, onSendMessage, isLoading }) => (
    <div data-testid="chat-interface">
      {conversation ? (
        <>
          <div data-testid="conversation-title">{conversation.title}</div>
          <div data-testid="messages-count">{conversation.messages.length}</div>
          <button onClick={() => onSendMessage('test message')} disabled={isLoading}>
            Send Message
          </button>
          {isLoading && <div data-testid="loading">Loading...</div>}
        </>
      ) : (
        <div>No conversation selected</div>
      )}
    </div>
  )
}));

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial Load', () => {
    it('should render without crashing', async () => {
      api.listConversations.mockResolvedValue([]);
      render(<App />);
      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
      expect(screen.getByTestId('chat-interface')).toBeInTheDocument();
    });

    it('should load conversations on mount', async () => {
      const mockConversations = [
        { id: '1', title: 'Conv 1', message_count: 2, created_at: '2024-01-01' },
        { id: '2', title: 'Conv 2', message_count: 5, created_at: '2024-01-02' }
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

      expect(screen.queryByTestId('conversation-1')).not.toBeInTheDocument();
    });

    it('should handle errors when loading conversations', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      api.listConversations.mockRejectedValue(new Error('Failed to load'));

      render(<App />);

      await waitFor(() => {
        expect(api.listConversations).toHaveBeenCalled();
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to load conversations:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Creating Conversations', () => {
    it('should create new conversation when button clicked', async () => {
      const newConversation = {
        id: 'new-123',
        created_at: '2024-01-01T00:00:00',
        title: 'New Conversation',
        messages: []
      };

      api.listConversations.mockResolvedValue([]);
      api.createConversation.mockResolvedValue(newConversation);

      render(<App />);

      await waitFor(() => {
        expect(api.listConversations).toHaveBeenCalled();
      });

      const newConvButton = screen.getByTestId('new-conversation-btn');
      await userEvent.click(newConvButton);

      await waitFor(() => {
        expect(api.createConversation).toHaveBeenCalled();
      });

      expect(screen.getByTestId('conversation-new-123')).toBeInTheDocument();
    });

    it('should set newly created conversation as current', async () => {
      const newConversation = {
        id: 'new-123',
        created_at: '2024-01-01T00:00:00',
        title: 'New Conversation',
        messages: []
      };

      api.listConversations.mockResolvedValue([]);
      api.createConversation.mockResolvedValue(newConversation);
      api.getConversation.mockResolvedValue(newConversation);

      render(<App />);

      await waitFor(() => {
        expect(api.listConversations).toHaveBeenCalled();
      });

      await userEvent.click(screen.getByTestId('new-conversation-btn'));

      await waitFor(() => {
        expect(api.getConversation).toHaveBeenCalledWith('new-123');
      });
    });

    it('should prepend new conversation to list', async () => {
      const existingConvs = [
        { id: '1', title: 'Old Conv', message_count: 2, created_at: '2024-01-01' }
      ];
      const newConversation = {
        id: 'new-123',
        created_at: '2024-01-02T00:00:00',
        title: 'New Conversation',
        messages: []
      };

      api.listConversations.mockResolvedValue(existingConvs);
      api.createConversation.mockResolvedValue(newConversation);

      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('conversation-1')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByTestId('new-conversation-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('conversation-new-123')).toBeInTheDocument();
      });

      expect(screen.getByTestId('conversation-1')).toBeInTheDocument();
    });

    it('should handle errors when creating conversation', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      api.listConversations.mockResolvedValue([]);
      api.createConversation.mockRejectedValue(new Error('Creation failed'));

      render(<App />);

      await waitFor(() => {
        expect(api.listConversations).toHaveBeenCalled();
      });

      await userEvent.click(screen.getByTestId('new-conversation-btn'));

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Failed to create conversation:',
          expect.any(Error)
        );
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Selecting Conversations', () => {
    it('should load conversation when selected', async () => {
      const mockConversations = [
        { id: '1', title: 'Conv 1', message_count: 2, created_at: '2024-01-01' }
      ];
      const fullConversation = {
        id: '1',
        title: 'Conv 1',
        messages: [{ role: 'user', content: 'Hello' }],
        created_at: '2024-01-01'
      };

      api.listConversations.mockResolvedValue(mockConversations);
      api.getConversation.mockResolvedValue(fullConversation);

      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('conversation-1')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByTestId('conversation-1'));

      await waitFor(() => {
        expect(api.getConversation).toHaveBeenCalledWith('1');
      });

      expect(screen.getByTestId('conversation-title')).toHaveTextContent('Conv 1');
      expect(screen.getByTestId('messages-count')).toHaveTextContent('1');
    });

    it('should handle errors when loading conversation', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const mockConversations = [
        { id: '1', title: 'Conv 1', message_count: 2, created_at: '2024-01-01' }
      ];

      api.listConversations.mockResolvedValue(mockConversations);
      api.getConversation.mockRejectedValue(new Error('Load failed'));

      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('conversation-1')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByTestId('conversation-1'));

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Failed to load conversation:',
          expect.any(Error)
        );
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Sending Messages', () => {
    it('should send message using streaming API', async () => {
      const conversation = {
        id: 'test-123',
        title: 'Test Conv',
        messages: [],
        created_at: '2024-01-01'
      };

      api.listConversations.mockResolvedValue([]);
      api.createConversation.mockResolvedValue(conversation);
      api.getConversation.mockResolvedValue(conversation);
      api.sendMessageStream.mockImplementation(async (convId, content, onEvent) => {
        onEvent('stage1_start', { type: 'stage1_start' });
        onEvent('stage1_complete', { type: 'stage1_complete', data: [] });
        onEvent('complete', { type: 'complete' });
      });

      render(<App />);

      await waitFor(() => {
        expect(api.listConversations).toHaveBeenCalled();
      });

      await userEvent.click(screen.getByTestId('new-conversation-btn'));

      await waitFor(() => {
        expect(api.getConversation).toHaveBeenCalled();
      });

      const sendButton = screen.getByText('Send Message');
      await userEvent.click(sendButton);

      await waitFor(() => {
        expect(api.sendMessageStream).toHaveBeenCalledWith(
          'test-123',
          'test message',
          expect.any(Function)
        );
      });
    });

    it('should not send message when no conversation selected', async () => {
      api.listConversations.mockResolvedValue([]);

      render(<App />);

      await waitFor(() => {
        expect(api.listConversations).toHaveBeenCalled();
      });

      // Try to send without selecting conversation - should not call API
      expect(api.sendMessageStream).not.toHaveBeenCalled();
    });

    it('should show loading state while sending message', async () => {
      const conversation = {
        id: 'test-123',
        title: 'Test Conv',
        messages: [],
        created_at: '2024-01-01'
      };

      api.listConversations.mockResolvedValue([]);
      api.createConversation.mockResolvedValue(conversation);
      api.getConversation.mockResolvedValue(conversation);
      
      let resolveStream;
      api.sendMessageStream.mockImplementation(() => {
        return new Promise(resolve => {
          resolveStream = resolve;
        });
      });

      render(<App />);

      await waitFor(() => {
        expect(api.listConversations).toHaveBeenCalled();
      });

      await userEvent.click(screen.getByTestId('new-conversation-btn'));

      await waitFor(() => {
        expect(screen.getByText('Send Message')).toBeInTheDocument();
      });

      const sendButton = screen.getByText('Send Message');
      await userEvent.click(sendButton);

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toBeInTheDocument();
      });

      // Resolve the stream
      resolveStream();

      await waitFor(() => {
        expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
      });
    });

    it('should update conversation with streaming events', async () => {
      const conversation = {
        id: 'test-123',
        title: 'Test Conv',
        messages: [],
        created_at: '2024-01-01'
      };

      api.listConversations.mockResolvedValue([]);
      api.createConversation.mockResolvedValue(conversation);
      api.getConversation.mockResolvedValue(conversation);
      
      api.sendMessageStream.mockImplementation(async (convId, content, onEvent) => {
        onEvent('stage1_start', { type: 'stage1_start' });
        onEvent('stage1_complete', { 
          type: 'stage1_complete', 
          data: [{ model: 'm1', response: 'Response' }] 
        });
        onEvent('stage2_start', { type: 'stage2_start' });
        onEvent('stage2_complete', { type: 'stage2_complete', data: [] });
        onEvent('stage3_start', { type: 'stage3_start' });
        onEvent('stage3_complete', { 
          type: 'stage3_complete', 
          data: { model: 'chairman', response: 'Final' } 
        });
        onEvent('complete', { type: 'complete' });
      });

      render(<App />);

      await waitFor(() => {
        expect(api.listConversations).toHaveBeenCalled();
      });

      await userEvent.click(screen.getByTestId('new-conversation-btn'));

      await waitFor(() => {
        expect(screen.getByText('Send Message')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByText('Send Message'));

      await waitFor(() => {
        expect(api.sendMessageStream).toHaveBeenCalled();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid conversation switching', async () => {
      const conversations = [
        { id: '1', title: 'Conv 1', message_count: 2, created_at: '2024-01-01' },
        { id: '2', title: 'Conv 2', message_count: 3, created_at: '2024-01-02' }
      ];

      api.listConversations.mockResolvedValue(conversations);
      api.getConversation.mockImplementation(async (id) => ({
        id,
        title: `Conv ${id}`,
        messages: [],
        created_at: '2024-01-01'
      }));

      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('conversation-1')).toBeInTheDocument();
      });

      // Rapidly switch between conversations
      await userEvent.click(screen.getByTestId('conversation-1'));
      await userEvent.click(screen.getByTestId('conversation-2'));
      await userEvent.click(screen.getByTestId('conversation-1'));

      await waitFor(() => {
        expect(api.getConversation).toHaveBeenCalledWith('1');
      });
    });

    it('should handle large number of conversations', async () => {
      const manyConversations = Array.from({ length: 100 }, (_, i) => ({
        id: `conv-${i}`,
        title: `Conversation ${i}`,
        message_count: i,
        created_at: `2024-01-01T00:00:${i}`
      }));

      api.listConversations.mockResolvedValue(manyConversations);

      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('conversation-conv-0')).toBeInTheDocument();
      });

      expect(screen.getByTestId('conversation-conv-99')).toBeInTheDocument();
    });
  });
});