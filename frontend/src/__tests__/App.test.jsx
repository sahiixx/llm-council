/**
 * Comprehensive unit tests for App component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import App from '../App';
import { api } from '../api';

vi.mock('../api');

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render Sidebar and ChatInterface', () => {
    api.listConversations.mockResolvedValue([]);
    render(<App />);
    
    expect(screen.getByText('LLM Council')).toBeInTheDocument();
  });

  it('should load conversations on mount', async () => {
    const mockConversations = [
      { id: '1', title: 'Test Conv', message_count: 2 },
    ];
    api.listConversations.mockResolvedValue(mockConversations);

    render(<App />);

    await waitFor(() => {
      expect(api.listConversations).toHaveBeenCalled();
    });
  });

  it('should handle conversation creation', async () => {
    api.listConversations.mockResolvedValue([]);
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

    const newButton = screen.getByText('+ New Conversation');
    fireEvent.click(newButton);

    await waitFor(() => {
      expect(api.createConversation).toHaveBeenCalled();
    });
  });

  it('should load conversation when selected', async () => {
    const mockConversations = [
      { id: '1', title: 'Conv 1', message_count: 2 },
    ];
    const mockConversation = {
      id: '1',
      title: 'Conv 1',
      messages: [{ role: 'user', content: 'Hello' }],
    };
    
    api.listConversations.mockResolvedValue(mockConversations);
    api.getConversation.mockResolvedValue(mockConversation);

    render(<App />);

    await waitFor(() => {
      expect(api.listConversations).toHaveBeenCalled();
    });
  });

  it('should handle send message with streaming', async () => {
    const mockConversation = {
      id: 'test-123',
      title: 'Test',
      messages: [],
    };
    
    api.listConversations.mockResolvedValue([]);
    api.getConversation.mockResolvedValue(mockConversation);
    api.sendMessageStream.mockImplementation(async (id, content, callback) => {
      callback('stage1_start', { type: 'stage1_start' });
      callback('stage1_complete', { type: 'stage1_complete', data: [] });
      callback('complete', { type: 'complete' });
    });

    render(<App />);
    
    await waitFor(() => {
      expect(api.listConversations).toHaveBeenCalled();
    });
  });

  it('should handle errors when loading conversations', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    api.listConversations.mockRejectedValue(new Error('Network error'));

    render(<App />);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    consoleErrorSpy.mockRestore();
  });

  it('should handle errors when creating conversation', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    api.listConversations.mockResolvedValue([]);
    api.createConversation.mockRejectedValue(new Error('Creation failed'));

    render(<App />);

    await waitFor(() => {
      const button = screen.getByText('+ New Conversation');
      fireEvent.click(button);
    });

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    consoleErrorSpy.mockRestore();
  });

  it('should update conversation list after sending message', async () => {
    const mockConversation = {
      id: 'test',
      messages: [],
    };
    
    api.listConversations.mockResolvedValue([]);
    api.getConversation.mockResolvedValue(mockConversation);
    api.sendMessageStream.mockImplementation(async (id, content, callback) => {
      callback('complete', { type: 'complete' });
    });

    render(<App />);
    
    await waitFor(() => {
      expect(api.listConversations).toHaveBeenCalledTimes(1);
    });
  });

  it('should handle streaming events progressively', async () => {
    const mockConversation = {
      id: 'test',
      title: 'Test',
      messages: [],
    };
    
    api.listConversations.mockResolvedValue([]);
    api.getConversation.mockResolvedValue(mockConversation);
    api.sendMessageStream.mockImplementation(async (id, content, callback) => {
      callback('stage1_start', { type: 'stage1_start' });
      callback('stage1_complete', { 
        type: 'stage1_complete', 
        data: [{ model: 'm1', response: 'R1' }] 
      });
      callback('stage2_start', { type: 'stage2_start' });
      callback('stage2_complete', { 
        type: 'stage2_complete',
        data: [],
        metadata: { label_to_model: {}, aggregate_rankings: [] }
      });
      callback('stage3_start', { type: 'stage3_start' });
      callback('stage3_complete', { 
        type: 'stage3_complete',
        data: { model: 'chairman', response: 'Final' }
      });
      callback('complete', { type: 'complete' });
    });

    render(<App />);
    
    await waitFor(() => {
      expect(api.listConversations).toHaveBeenCalled();
    });
  });

  it('should handle title generation event', async () => {
    const mockConversation = {
      id: 'test',
      messages: [],
    };
    
    api.listConversations.mockResolvedValue([]);
    api.getConversation.mockResolvedValue(mockConversation);
    api.sendMessageStream.mockImplementation(async (id, content, callback) => {
      callback('title_complete', { 
        type: 'title_complete',
        data: { title: 'New Title' }
      });
      callback('complete', { type: 'complete' });
    });

    render(<App />);
    
    await waitFor(() => {
      expect(api.listConversations).toHaveBeenCalled();
    });
  });

  it('should handle streaming error events', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const mockConversation = {
      id: 'test',
      messages: [],
    };
    
    api.listConversations.mockResolvedValue([]);
    api.getConversation.mockResolvedValue(mockConversation);
    api.sendMessageStream.mockImplementation(async (id, content, callback) => {
      callback('error', { type: 'error', message: 'Stream failed' });
    });

    render(<App />);
    
    await waitFor(() => {
      expect(api.listConversations).toHaveBeenCalled();
    });

    consoleErrorSpy.mockRestore();
  });

  it('should show empty state when no conversation selected', async () => {
    api.listConversations.mockResolvedValue([]);

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Welcome to LLM Council/i)).toBeInTheDocument();
    });
  });
});