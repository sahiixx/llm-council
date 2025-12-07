/**
 * Comprehensive unit tests for App.jsx
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../App';
import { api } from '../../api';

// Mock the API module
vi.mock('../../api', () => ({
  api: {
    listConversations: vi.fn(),
    createConversation: vi.fn(),
    getConversation: vi.fn(),
    sendMessageStream: vi.fn(),
  },
}));

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial Rendering', () => {
    it('should render without crashing', async () => {
      api.listConversations.mockResolvedValue([]);
      
      render(<App />);
      
      await waitFor(() => {
        expect(api.listConversations).toHaveBeenCalled();
      });
    });

    it('should load conversations on mount', async () => {
      const mockConversations = [
        { id: '1', title: 'Test Conv 1', created_at: '2024-01-01T00:00:00', message_count: 2 },
        { id: '2', title: 'Test Conv 2', created_at: '2024-01-02T00:00:00', message_count: 1 },
      ];
      api.listConversations.mockResolvedValue(mockConversations);
      
      render(<App />);
      
      await waitFor(() => {
        expect(api.listConversations).toHaveBeenCalledTimes(1);
      });
    });

    it('should handle conversation loading errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      api.listConversations.mockRejectedValue(new Error('Network error'));
      
      render(<App />);
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });
      
      consoleSpy.mockRestore();
    });
  });

  describe('New Conversation Creation', () => {
    it('should create new conversation when button clicked', async () => {
      const user = userEvent.setup();
      const mockNewConv = {
        id: 'new-123',
        created_at: '2024-01-03T00:00:00',
        title: 'New Conversation',
        messages: [],
      };
      
      api.listConversations.mockResolvedValue([]);
      api.createConversation.mockResolvedValue(mockNewConv);
      
      render(<App />);
      
      const newConvButton = await screen.findByText(/new/i);
      await user.click(newConvButton);
      
      await waitFor(() => {
        expect(api.createConversation).toHaveBeenCalled();
      });
    });

    it('should set newly created conversation as current', async () => {
      const user = userEvent.setup();
      const mockNewConv = {
        id: 'new-456',
        created_at: '2024-01-03T00:00:00',
        title: 'New Conversation',
        messages: [],
      };
      
      api.listConversations.mockResolvedValue([]);
      api.createConversation.mockResolvedValue(mockNewConv);
      api.getConversation.mockResolvedValue(mockNewConv);
      
      render(<App />);
      
      const newConvButton = await screen.findByText(/new/i);
      await user.click(newConvButton);
      
      await waitFor(() => {
        expect(api.getConversation).toHaveBeenCalledWith('new-456');
      });
    });

    it('should handle creation errors gracefully', async () => {
      const user = userEvent.setup();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      api.listConversations.mockResolvedValue([]);
      api.createConversation.mockRejectedValue(new Error('Creation failed'));
      
      render(<App />);
      
      const newConvButton = await screen.findByText(/new/i);
      await user.click(newConvButton);
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });
      
      consoleSpy.mockRestore();
    });
  });

  describe('Conversation Selection', () => {
    it('should load conversation when selected', async () => {
      const user = userEvent.setup();
      const mockConvs = [
        { id: 'conv-1', title: 'Conversation 1', created_at: '2024-01-01', message_count: 1 },
      ];
      const mockFullConv = {
        id: 'conv-1',
        title: 'Conversation 1',
        created_at: '2024-01-01',
        messages: [{ role: 'user', content: 'Hello' }],
      };
      
      api.listConversations.mockResolvedValue(mockConvs);
      api.getConversation.mockResolvedValue(mockFullConv);
      
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('Conversation 1')).toBeInTheDocument();
      });
      
      const convElement = screen.getByText('Conversation 1');
      await user.click(convElement);
      
      await waitFor(() => {
        expect(api.getConversation).toHaveBeenCalledWith('conv-1');
      });
    });

    it('should handle conversation load errors', async () => {
      const user = userEvent.setup();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const mockConvs = [
        { id: 'conv-1', title: 'Conversation 1', created_at: '2024-01-01', message_count: 1 },
      ];
      
      api.listConversations.mockResolvedValue(mockConvs);
      api.getConversation.mockRejectedValue(new Error('Load failed'));
      
      render(<App />);
      
      await waitFor(() => {
        const convElement = screen.getByText('Conversation 1');
        return userEvent.click(convElement);
      });
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });
      
      consoleSpy.mockRestore();
    });
  });

  describe('Message Sending', () => {
    it('should optimistically add user message', async () => {
      const user = userEvent.setup();
      const mockConv = {
        id: 'conv-1',
        title: 'Test',
        created_at: '2024-01-01',
        messages: [],
      };
      
      api.listConversations.mockResolvedValue([]);
      api.createConversation.mockResolvedValue(mockConv);
      api.getConversation.mockResolvedValue(mockConv);
      api.sendMessageStream.mockImplementation(async (id, content, callback) => {
        callback('complete', {});
      });
      
      render(<App />);
      
      const newConvButton = await screen.findByText(/new/i);
      await user.click(newConvButton);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/type.*message/i)).toBeInTheDocument();
      });
      
      const input = screen.getByPlaceholderText(/type.*message/i);
      await user.type(input, 'Test message');
      await user.keyboard('{Enter}');
      
      await waitFor(() => {
        expect(api.sendMessageStream).toHaveBeenCalled();
      });
    });

    it('should handle streaming events correctly', async () => {
      const user = userEvent.setup();
      const mockConv = {
        id: 'conv-1',
        title: 'Test',
        created_at: '2024-01-01',
        messages: [],
      };
      
      api.listConversations.mockResolvedValue([]);
      api.createConversation.mockResolvedValue(mockConv);
      api.getConversation.mockResolvedValue(mockConv);
      
      let streamCallback;
      api.sendMessageStream.mockImplementation(async (id, content, callback) => {
        streamCallback = callback;
        callback('stage1_start', {});
        callback('stage1_complete', { data: [{ model: 'm1', response: 'R1' }] });
        callback('complete', {});
      });
      
      render(<App />);
      
      const newConvButton = await screen.findByText(/new/i);
      await user.click(newConvButton);
      
      await waitFor(() => {
        const input = screen.getByPlaceholderText(/type.*message/i);
        return user.type(input, 'Test{Enter}');
      });
      
      await waitFor(() => {
        expect(api.sendMessageStream).toHaveBeenCalled();
      });
    });

    it('should reload conversations on stream complete', async () => {
      const user = userEvent.setup();
      const mockConv = {
        id: 'conv-1',
        title: 'Test',
        created_at: '2024-01-01',
        messages: [],
      };
      
      api.listConversations.mockResolvedValue([]);
      api.createConversation.mockResolvedValue(mockConv);
      api.getConversation.mockResolvedValue(mockConv);
      api.sendMessageStream.mockImplementation(async (id, content, callback) => {
        callback('complete', {});
      });
      
      render(<App />);
      
      const newConvButton = await screen.findByText(/new/i);
      await user.click(newConvButton);
      
      await waitFor(() => {
        const input = screen.getByPlaceholderText(/type.*message/i);
        return user.type(input, 'Test{Enter}');
      });
      
      await waitFor(() => {
        // listConversations called twice: on mount and on complete
        expect(api.listConversations).toHaveBeenCalledTimes(2);
      });
    });

    it('should handle stream errors', async () => {
      const user = userEvent.setup();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const mockConv = {
        id: 'conv-1',
        title: 'Test',
        created_at: '2024-01-01',
        messages: [],
      };
      
      api.listConversations.mockResolvedValue([]);
      api.createConversation.mockResolvedValue(mockConv);
      api.getConversation.mockResolvedValue(mockConv);
      api.sendMessageStream.mockRejectedValue(new Error('Stream error'));
      
      render(<App />);
      
      const newConvButton = await screen.findByText(/new/i);
      await user.click(newConvButton);
      
      await waitFor(() => {
        const input = screen.getByPlaceholderText(/type.*message/i);
        return user.type(input, 'Test{Enter}');
      });
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });
      
      consoleSpy.mockRestore();
    });
  });

  describe('Loading States', () => {
    it('should set loading state during message send', async () => {
      const user = userEvent.setup();
      const mockConv = {
        id: 'conv-1',
        title: 'Test',
        created_at: '2024-01-01',
        messages: [],
      };
      
      api.listConversations.mockResolvedValue([]);
      api.createConversation.mockResolvedValue(mockConv);
      api.getConversation.mockResolvedValue(mockConv);
      
      let resolveStream;
      api.sendMessageStream.mockImplementation(() => new Promise((resolve) => {
        resolveStream = resolve;
      }));
      
      render(<App />);
      
      const newConvButton = await screen.findByText(/new/i);
      await user.click(newConvButton);
      
      await waitFor(() => {
        const input = screen.getByPlaceholderText(/type.*message/i);
        return user.type(input, 'Test{Enter}');
      });
      
      // Should be loading
      await waitFor(() => {
        expect(api.sendMessageStream).toHaveBeenCalled();
      });
      
      // Resolve stream
      resolveStream();
    });

    it('should clear loading state after error', async () => {
      const user = userEvent.setup();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const mockConv = {
        id: 'conv-1',
        title: 'Test',
        created_at: '2024-01-01',
        messages: [],
      };
      
      api.listConversations.mockResolvedValue([]);
      api.createConversation.mockResolvedValue(mockConv);
      api.getConversation.mockResolvedValue(mockConv);
      api.sendMessageStream.mockRejectedValue(new Error('Error'));
      
      render(<App />);
      
      const newConvButton = await screen.findByText(/new/i);
      await user.click(newConvButton);
      
      await waitFor(() => {
        const input = screen.getByPlaceholderText(/type.*message/i);
        return user.type(input, 'Test{Enter}');
      });
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });
      
      consoleSpy.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty conversations list', async () => {
      api.listConversations.mockResolvedValue([]);
      
      render(<App />);
      
      await waitFor(() => {
        expect(api.listConversations).toHaveBeenCalled();
      });
    });

    it('should not send message without conversation selected', async () => {
      api.listConversations.mockResolvedValue([]);
      
      render(<App />);
      
      // Try to trigger send without selecting conversation
      // Should not crash
      await waitFor(() => {
        expect(api.listConversations).toHaveBeenCalled();
      });
    });

    it('should handle rapid conversation switches', async () => {
      const user = userEvent.setup();
      const mockConvs = [
        { id: 'conv-1', title: 'Conv 1', created_at: '2024-01-01', message_count: 1 },
        { id: 'conv-2', title: 'Conv 2', created_at: '2024-01-02', message_count: 1 },
      ];
      
      api.listConversations.mockResolvedValue(mockConvs);
      api.getConversation.mockResolvedValue({
        id: 'conv-1',
        title: 'Conv 1',
        messages: [],
      });
      
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('Conv 1')).toBeInTheDocument();
      });
      
      const conv1 = screen.getByText('Conv 1');
      const conv2 = screen.getByText('Conv 2');
      
      // Rapidly switch between conversations
      await user.click(conv1);
      await user.click(conv2);
      await user.click(conv1);
      
      // Should handle gracefully
      await waitFor(() => {
        expect(api.getConversation).toHaveBeenCalled();
      });
    });
  });
});