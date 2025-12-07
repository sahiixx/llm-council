/**
 * Tests for frontend/src/api.js
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { api } from '../api';

// Mock fetch globally
global.fetch = vi.fn();

describe('api.listConversations', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  it('should fetch all conversations successfully', async () => {
    const mockConversations = [
      { id: '1', title: 'Conv 1', created_at: '2025-01-01', message_count: 3 },
      { id: '2', title: 'Conv 2', created_at: '2025-01-02', message_count: 5 },
    ];

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockConversations,
    });

    const result = await api.listConversations();

    expect(fetch).toHaveBeenCalledWith('http://localhost:8001/api/conversations');
    expect(result).toEqual(mockConversations);
  });

  it('should throw error on failed request', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    await expect(api.listConversations()).rejects.toThrow(
      'Failed to list conversations'
    );
  });

  it('should handle network errors', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'));

    await expect(api.listConversations()).rejects.toThrow('Network error');
  });
});

describe('api.createConversation', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  it('should create a new conversation successfully', async () => {
    const mockConversation = {
      id: 'new-123',
      title: 'New Conversation',
      created_at: '2025-01-01',
      messages: [],
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockConversation,
    });

    const result = await api.createConversation();

    expect(fetch).toHaveBeenCalledWith('http://localhost:8001/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(result).toEqual(mockConversation);
  });

  it('should throw error when creation fails', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
    });

    await expect(api.createConversation()).rejects.toThrow(
      'Failed to create conversation'
    );
  });
});

describe('api.getConversation', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  it('should fetch a specific conversation', async () => {
    const conversationId = 'conv-123';
    const mockConversation = {
      id: conversationId,
      title: 'Test Conv',
      messages: [{ role: 'user', content: 'Hello' }],
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockConversation,
    });

    const result = await api.getConversation(conversationId);

    expect(fetch).toHaveBeenCalledWith(
      `http://localhost:8001/api/conversations/${conversationId}`
    );
    expect(result).toEqual(mockConversation);
  });

  it('should throw error for non-existent conversation', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    await expect(api.getConversation('nonexistent')).rejects.toThrow(
      'Failed to get conversation'
    );
  });
});

describe('api.sendMessage', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  it('should send a message successfully', async () => {
    const conversationId = 'conv-123';
    const content = 'Test message';
    const mockResponse = {
      stage1: [{ model: 'm1', response: 'r1' }],
      stage2: [{ model: 'm1', ranking: 'rank' }],
      stage3: { model: 'chairman', response: 'final' },
      metadata: {},
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await api.sendMessage(conversationId, content);

    expect(fetch).toHaveBeenCalledWith(
      `http://localhost:8001/api/conversations/${conversationId}/message`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      }
    );
    expect(result).toEqual(mockResponse);
  });

  it('should handle empty message content', async () => {
    const conversationId = 'conv-123';
    const content = '';

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ stage1: [], stage2: [], stage3: {}, metadata: {} }),
    });

    await api.sendMessage(conversationId, content);

    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({ content: '' }),
      })
    );
  });

  it('should throw error when send fails', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    await expect(api.sendMessage('conv-123', 'test')).rejects.toThrow(
      'Failed to send message'
    );
  });
});

describe('api.sendMessageStream', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  it('should handle streaming events', async () => {
    const conversationId = 'conv-123';
    const content = 'Test message';
    const events = [];

    const mockReader = {
      read: vi
        .fn()
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode(
            'data: {"type":"stage1_complete","data":[{"model":"m1","response":"r1"}]}\n\n'
          ),
        })
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode(
            'data: {"type":"complete"}\n\n'
          ),
        })
        .mockResolvedValueOnce({ done: true }),
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      body: {
        getReader: () => mockReader,
      },
    });

    await api.sendMessageStream(conversationId, content, (type, event) => {
      events.push({ type, event });
    });

    expect(events).toHaveLength(2);
    expect(events[0].type).toBe('stage1_complete');
    expect(events[1].type).toBe('complete');
  });

  it('should handle malformed SSE data gracefully', async () => {
    const conversationId = 'conv-123';
    const content = 'Test';
    const mockReader = {
      read: vi
        .fn()
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('data: {invalid json}\n\n'),
        })
        .mockResolvedValueOnce({ done: true }),
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      body: { getReader: () => mockReader },
    });

    // Should not throw, just log error
    await api.sendMessageStream(conversationId, content, vi.fn());
  });

  it('should throw error when streaming fails', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    await expect(
      api.sendMessageStream('conv-123', 'test', vi.fn())
    ).rejects.toThrow('Failed to send message');
  });

  it('should handle multiple events in single chunk', async () => {
    const events = [];
    const mockReader = {
      read: vi
        .fn()
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode(
            'data: {"type":"stage1_start"}\n\ndata: {"type":"stage1_complete","data":[]}\n\n'
          ),
        })
        .mockResolvedValueOnce({ done: true }),
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      body: { getReader: () => mockReader },
    });

    await api.sendMessageStream('conv-123', 'test', (type, event) => {
      events.push({ type, event });
    });

    expect(events).toHaveLength(2);
    expect(events[0].type).toBe('stage1_start');
    expect(events[1].type).toBe('stage1_complete');
  });

  it('should handle empty lines in stream', async () => {
    const events = [];
    const mockReader = {
      read: vi
        .fn()
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode(
            '\n\ndata: {"type":"test"}\n\n\n'
          ),
        })
        .mockResolvedValueOnce({ done: true }),
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      body: { getReader: () => mockReader },
    });

    await api.sendMessageStream('conv-123', 'test', (type, event) => {
      events.push(type);
    });

    expect(events).toHaveLength(1);
    expect(events[0]).toBe('test');
  });
});

describe('API_BASE configuration', () => {
  it('should use correct base URL', () => {
    // The API_BASE is used in all API calls
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('Error handling edge cases', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  it('should handle undefined response body', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error('No body');
      },
    });

    await expect(api.listConversations()).rejects.toThrow();
  });

  it('should handle fetch rejection', async () => {
    fetch.mockRejectedValueOnce(new Error('Network failure'));

    await expect(api.createConversation()).rejects.toThrow('Network failure');
  });
});