/**
 * Comprehensive unit tests for App component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';
import { api } from './api';

vi.mock('./api');

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.listConversations.mockResolvedValue([]);
  });

  describe('Initial Rendering', () => {
    it('should render app with sidebar and chat interface', async () => {
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('LLM Council')).toBeInTheDocument();
      });
    });

    it('should load conversations on mount', async () => {
      const mockConversations = [
        { id: '1', title: 'Conv 1', message_count: 5, created_at: '2024-01-01' },
      ];
      
      api.listConversations.mockResolvedValue(mockConversations);
      
      render(<App />);
      
      await waitFor(() => {
        expect(api.listConversations).toHaveBeenCalledTimes(1);
      });
    });

    it('should show empty state when no conversations', async () => {
      api.listConversations.mockResolvedValue([]);
      
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('No conversations yet')).toBeInTheDocument();
      });
    });
  });

  describe('Creating Conversations', () => {
    it('should create new conversation when button clicked', async () => {
      const newConv = {
        id: 'new-123',
        created_at: '2024-01-01T00:00:00',
        title: 'New Conversation',
        messages: [],
      };
      
      api.createConversation.mockResolvedValue(newConv);
      api.getConversation.mockResolvedValue(newConv);
      
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('+ New Conversation')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('+ New Conversation'));
      
      await waitFor(() => {
        expect(api.createConversation).toHaveBeenCalled();
      });
    });

    it('should select new conversation after creation', async () => {
      const newConv = {
        id: 'new-123',
        created_at: '2024-01-01T00:00:00',
        title: 'New Conversation',
        messages: [],
      };
      
      api.createConversation.mockResolvedValue(newConv);
      api.getConversation.mockResolvedValue(newConv);
      
      render(<App />);
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('+ New Conversation'));
      });
      
      await waitFor(() => {
        expect(api.getConversation).toHaveBeenCalledWith('new-123');
      });
    });
  });

  describe('Selecting Conversations', () => {
    it('should load conversation when selected', async () => {
      const conversations = [
        { id: 'conv-1', title: 'Test Conv', message_count: 1, created_at: '2024-01-01' },
      ];
      
      const fullConversation = {
        id: 'conv-1',
        title: 'Test Conv',
        messages: [{ role: 'user', content: 'Hello' }],
      };
      
      api.listConversations.mockResolvedValue(conversations);
      api.getConversation.mockResolvedValue(fullConversation);
      
      render(<App />);
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('Test Conv'));
      });
      
      await waitFor(() => {
        expect(api.getConversation).toHaveBeenCalledWith('conv-1');
      });
    });
  });

  describe('Sending Messages', () => {
    it('should handle sending message with streaming', async () => {
      const conversation = {
        id: 'conv-1',
        title: 'Test',
        messages: [],
      };
      
      api.listConversations.mockResolvedValue([]);
      api.createConversation.mockResolvedValue(conversation);
      api.getConversation.mockResolvedValue(conversation);
      api.sendMessageStream.mockImplementation(async (id, content, callback) => {
        callback('complete', {});
      });
      
      render(<App />);
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('+ New Conversation'));
      });
      
      await waitFor(() => {
        const textarea = screen.getByPlaceholderText(/Ask your question/);
        fireEvent.change(textarea, { target: { value: 'Test message' } });
        fireEvent.click(screen.getByText('Send'));
      });
      
      await waitFor(() => {
        expect(api.sendMessageStream).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle error when loading conversations fails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      api.listConversations.mockRejectedValue(new Error('Network error'));
      
      render(<App />);
      
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalled();
      });
      
      consoleErrorSpy.mockRestore();
    });

    it('should handle error when creating conversation fails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      api.createConversation.mockRejectedValue(new Error('Failed'));
      
      render(<App />);
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('+ New Conversation'));
      });
      
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalled();
      });
      
      consoleErrorSpy.mockRestore();
    });
  });
});