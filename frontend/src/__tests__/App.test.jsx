import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { api } from '../api';

// Mock the API module
vi.mock('../api', () => ({
  api: {
    listConversations: vi.fn(),
    createConversation: vi.fn(),
    getConversation: vi.fn(),
    sendMessageStream: vi.fn(),
  },
}));

// Mock child components to isolate App component testing
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
          <div data-testid="conversation-id">{conversation.id}</div>
          <button 
            onClick={() => onSendMessage('Test message')} 
            data-testid="send-message-btn"
            disabled={isLoading}
          >
            Send
          </button>
          {isLoading && <div data-testid="loading-indicator">Loading...</div>}
        </>
      ) : (
        <div data-testid="no-conversation">No conversation</div>
      )}
    </div>
  ),
}));

describe('App Component', () => {
  const mockConversations = [
    { id: 'conv-1', created_at: '2024-01-01', title: 'First Chat', message_count: 2 },
    { id: 'conv-2', created_at: '2024-01-02', title: 'Second Chat', message_count: 4 },
  ];

  const mockConversation = {
    id: 'conv-1',
    created_at: '2024-01-01',
    title: 'First Chat',
    messages: [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', stage3: { model: 'test', response: 'Hi there!' } },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    api.listConversations.mockResolvedValue(mockConversations);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial Rendering', () => {
    it('renders without crashing', async () => {
      render(<App />);
      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
      expect(screen.getByTestId('chat-interface')).toBeInTheDocument();
    });

    it('loads conversations on mount', async () => {
      render(<App />);
      
      await waitFor(() => {
        expect(api.listConversations).toHaveBeenCalledTimes(1);
      });
    });

    it('displays no conversation initially', () => {
      render(<App />);
      expect(screen.getByTestId('no-conversation')).toBeInTheDocument();
    });
  });

  describe('Conversation List', () => {
    it('displays loaded conversations', async () => {
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByTestId('conversation-conv-1')).toBeInTheDocument();
        expect(screen.getByTestId('conversation-conv-2')).toBeInTheDocument();
      });
    });

    it('handles empty conversation list', async () => {
      api.listConversations.mockResolvedValue([]);
      
      render(<App />);
      
      await waitFor(() => {
        expect(screen.queryByTestId('conversation-conv-1')).not.toBeInTheDocument();
      });
    });

    it('handles conversation list loading error', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      api.listConversations.mockRejectedValue(new Error('Failed to load'));
      
      render(<App />);
      
      await waitFor(() => {
        expect(consoleError).toHaveBeenCalled();
      });
      
      consoleError.mockRestore();
    });
  });

  describe('Creating New Conversation', () => {
    it('creates new conversation when button clicked', async () => {
      const newConv = { id: 'conv-new', created_at: '2024-01-03', title: 'New', messages: [] };
      api.createConversation.mockResolvedValue(newConv);
      api.getConversation.mockResolvedValue(newConv);
      
      render(<App />);
      
      const newBtn = screen.getByTestId('new-conversation-btn');
      fireEvent.click(newBtn);
      
      await waitFor(() => {
        expect(api.createConversation).toHaveBeenCalledTimes(1);
      });
    });

    it('selects newly created conversation', async () => {
      const newConv = { id: 'conv-new', created_at: '2024-01-03', title: 'New', messages: [] };
      api.createConversation.mockResolvedValue(newConv);
      api.getConversation.mockResolvedValue(newConv);
      
      render(<App />);
      
      const newBtn = screen.getByTestId('new-conversation-btn');
      fireEvent.click(newBtn);
      
      await waitFor(() => {
        expect(screen.getByTestId('conversation-id')).toHaveTextContent('conv-new');
      });
    });

    it('handles conversation creation error', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      api.createConversation.mockRejectedValue(new Error('Failed to create'));
      
      render(<App />);
      
      const newBtn = screen.getByTestId('new-conversation-btn');
      fireEvent.click(newBtn);
      
      await waitFor(() => {
        expect(consoleError).toHaveBeenCalled();
      });
      
      consoleError.mockRestore();
    });
  });

  describe('Selecting Conversation', () => {
    it('loads conversation details when selected', async () => {
      api.getConversation.mockResolvedValue(mockConversation);
      
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByTestId('conversation-conv-1')).toBeInTheDocument();
      });
      
      const conv = screen.getByTestId('conversation-conv-1');
      fireEvent.click(conv);
      
      await waitFor(() => {
        expect(api.getConversation).toHaveBeenCalledWith('conv-1');
        expect(screen.getByTestId('conversation-id')).toHaveTextContent('conv-1');
      });
    });

    it('handles conversation loading error', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      api.getConversation.mockRejectedValue(new Error('Failed to load'));
      
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByTestId('conversation-conv-1')).toBeInTheDocument();
      });
      
      const conv = screen.getByTestId('conversation-conv-1');
      fireEvent.click(conv);
      
      await waitFor(() => {
        expect(consoleError).toHaveBeenCalled();
      });
      
      consoleError.mockRestore();
    });
  });

  describe('Sending Messages', () => {
    it('sends message with streaming API', async () => {
      api.getConversation.mockResolvedValue(mockConversation);
      api.sendMessageStream.mockImplementation(async (id, content, callback) => {
        callback('stage1_start', {});
        callback('stage1_complete', { data: [] });
        callback('complete', {});
      });
      
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByTestId('conversation-conv-1')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByTestId('conversation-conv-1'));
      
      await waitFor(() => {
        expect(screen.getByTestId('send-message-btn')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByTestId('send-message-btn'));
      
      await waitFor(() => {
        expect(api.sendMessageStream).toHaveBeenCalled();
      });
    });

    it('shows loading state while sending', async () => {
      api.getConversation.mockResolvedValue(mockConversation);
      api.sendMessageStream.mockImplementation(async (id, content, callback) => {
        await new Promise(resolve => setTimeout(resolve, 100));
        callback('complete', {});
      });
      
      render(<App />);
      
      await waitFor(() => screen.getByTestId('conversation-conv-1'));
      fireEvent.click(screen.getByTestId('conversation-conv-1'));
      
      await waitFor(() => screen.getByTestId('send-message-btn'));
      fireEvent.click(screen.getByTestId('send-message-btn'));
      
      expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
    });

    it('handles message sending error', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      api.getConversation.mockResolvedValue(mockConversation);
      api.sendMessageStream.mockRejectedValue(new Error('Failed to send'));
      
      render(<App />);
      
      await waitFor(() => screen.getByTestId('conversation-conv-1'));
      fireEvent.click(screen.getByTestId('conversation-conv-1'));
      
      await waitFor(() => screen.getByTestId('send-message-btn'));
      fireEvent.click(screen.getByTestId('send-message-btn'));
      
      await waitFor(() => {
        expect(consoleError).toHaveBeenCalled();
      });
      
      consoleError.mockRestore();
    });

    it('prevents sending when no conversation selected', async () => {
      render(<App />);
      
      // Try to trigger send without selecting conversation
      // Since ChatInterface is mocked and only renders when conversation exists,
      // we verify the send button doesn't exist
      expect(screen.queryByTestId('send-message-btn')).not.toBeInTheDocument();
    });
  });

  describe('Stream Event Handling', () => {
    beforeEach(async () => {
      api.getConversation.mockResolvedValue(mockConversation);
      render(<App />);
      await waitFor(() => screen.getByTestId('conversation-conv-1'));
      fireEvent.click(screen.getByTestId('conversation-conv-1'));
      await waitFor(() => screen.getByTestId('send-message-btn'));
    });

    it('handles stage1_complete event', async () => {
      api.sendMessageStream.mockImplementation(async (id, content, callback) => {
        callback('stage1_complete', { data: [{ model: 'test', response: 'response' }] });
        callback('complete', {});
      });
      
      fireEvent.click(screen.getByTestId('send-message-btn'));
      
      await waitFor(() => {
        expect(api.sendMessageStream).toHaveBeenCalled();
      });
    });

    it('handles stage2_complete event', async () => {
      api.sendMessageStream.mockImplementation(async (id, content, callback) => {
        callback('stage2_complete', { data: [], metadata: {} });
        callback('complete', {});
      });
      
      fireEvent.click(screen.getByTestId('send-message-btn'));
      
      await waitFor(() => {
        expect(api.sendMessageStream).toHaveBeenCalled();
      });
    });

    it('handles stage3_complete event', async () => {
      api.sendMessageStream.mockImplementation(async (id, content, callback) => {
        callback('stage3_complete', { data: { model: 'test', response: 'final' } });
        callback('complete', {});
      });
      
      fireEvent.click(screen.getByTestId('send-message-btn'));
      
      await waitFor(() => {
        expect(api.sendMessageStream).toHaveBeenCalled();
      });
    });

    it('reloads conversations on title_complete', async () => {
      api.sendMessageStream.mockImplementation(async (id, content, callback) => {
        callback('title_complete', { data: { title: 'New Title' } });
        callback('complete', {});
      });
      
      vi.clearAllMocks();
      fireEvent.click(screen.getByTestId('send-message-btn'));
      
      await waitFor(() => {
        expect(api.listConversations).toHaveBeenCalled();
      });
    });

    it('handles error event', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      api.sendMessageStream.mockImplementation(async (id, content, callback) => {
        callback('error', { message: 'Stream error' });
      });
      
      fireEvent.click(screen.getByTestId('send-message-btn'));
      
      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith('Stream error:', 'Stream error');
      });
      
      consoleError.mockRestore();
    });
  });
});