/**
 * Comprehensive unit tests for frontend/src/api.js
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { api } from './api';

// Mock fetch globally
global.fetch = vi.fn();

describe('api.listConversations', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  it('should fetch conversations successfully', async () => {
    const mockConversations = [
      { id: '1', title: 'Conv 1', message_count: 5 },
      { id: '2', title: 'Conv 2', message_count: 3 },
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

    await expect(api.listConversations()).rejects.toThrow('Failed to list conversations');
  });

  it('should handle network errors', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'));

    await expect(api.listConversations()).rejects.toThrow('Network error');
  });

  it('should handle empty conversation list', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    const result = await api.listConversations();

    expect(result).toEqual([]);
  });
});

describe('api.createConversation', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  it('should create conversation successfully', async () => {
    const mockConversation = {
      id: 'new-id',
      created_at: '2024-01-01T00:00:00',
      title: 'New Conversation',
      messages: [],
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockConversation,
    });

    const result = await api.createConversation();

    expect(fetch).toHaveBeenCalledWith('http://localhost:8001/api/conversations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    expect(result).toEqual(mockConversation);
  });

  it('should throw error on failed creation', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    await expect(api.createConversation()).rejects.toThrow('Failed to create conversation');
  });

  it('should handle server errors', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
    });

    await expect(api.createConversation()).rejects.toThrow();
  });
});

describe('api.getConversation', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  it('should fetch specific conversation', async () => {
    const mockConversation = {
      id: 'conv-123',
      title: 'Test Conversation',
      messages: [{ role: 'user', content: 'Hello' }],
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockConversation,
    });

    const result = await api.getConversation('conv-123');

    expect(fetch).toHaveBeenCalledWith('http://localhost:8001/api/conversations/conv-123');
    expect(result).toEqual(mockConversation);
  });

  it('should throw error for non-existent conversation', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    await expect(api.getConversation('nonexistent')).rejects.toThrow('Failed to get conversation');
  });

  it('should handle conversation with no messages', async () => {
    const mockConversation = {
      id: 'empty-conv',
      title: 'Empty',
      messages: [],
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockConversation,
    });

    const result = await api.getConversation('empty-conv');

    expect(result.messages).toEqual([]);
  });
});

describe('api.sendMessage', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  it('should send message successfully', async () => {
    const mockResponse = {
      stage1: [{ model: 'm1', response: 'R1' }],
      stage2: [{ model: 'm1', ranking: 'Rank' }],
      stage3: { model: 'chair', response: 'Final' },
      metadata: {},
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await api.sendMessage('conv-123', 'Hello');

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:8001/api/conversations/conv-123/message',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: 'Hello' }),
      }
    );
    expect(result).toEqual(mockResponse);
  });

  it('should handle empty message content', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ stage1: [], stage2: [], stage3: {} }),
    });

    await api.sendMessage('conv-123', '');

    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({ content: '' }),
      })
    );
  });

  it('should throw error on send failure', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    await expect(api.sendMessage('conv-123', 'Test')).rejects.toThrow('Failed to send message');
  });

  it('should handle special characters in message', async () => {
    const specialContent = 'Test with émojis 🎉 and 你好';

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ stage1: [], stage2: [], stage3: {} }),
    });

    await api.sendMessage('conv-123', specialContent);

    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({ content: specialContent }),
      })
    );
  });
});

describe('api.sendMessageStream', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  it('should handle streaming events', async () => {
    const mockEvents = [];
    const onEvent = vi.fn((type, event) => {
      mockEvents.push({ type, event });
    });

    const mockReader = {
      read: vi.fn()
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('data: {"type":"stage1_start"}\n\n'),
        })
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('data: {"type":"stage1_complete","data":[]}\n\n'),
        })
        .mockResolvedValueOnce({
          done: true,
        }),
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      body: {
        getReader: () => mockReader,
      },
    });

    await api.sendMessageStream('conv-123', 'Test', onEvent);

    expect(onEvent).toHaveBeenCalledWith('stage1_start', expect.objectContaining({ type: 'stage1_start' }));
    expect(onEvent).toHaveBeenCalledWith('stage1_complete', expect.objectContaining({ type: 'stage1_complete' }));
  });

  it('should throw error on stream failure', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    await expect(
      api.sendMessageStream('conv-123', 'Test', vi.fn())
    ).rejects.toThrow('Failed to send message');
  });

  it('should handle malformed SSE data', async () => {
    const onEvent = vi.fn();

    const mockReader = {
      read: vi.fn()
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('data: invalid json\n\n'),
        })
        .mockResolvedValueOnce({
          done: true,
        }),
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      body: {
        getReader: () => mockReader,
      },
    });

    // Should not throw, but log error
    await api.sendMessageStream('conv-123', 'Test', onEvent);

    // onEvent should not be called for invalid JSON
    expect(onEvent).not.toHaveBeenCalled();
  });

  it('should handle multiple events in single chunk', async () => {
    const onEvent = vi.fn();

    const mockReader = {
      read: vi.fn()
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode(
            'data: {"type":"stage1_start"}\n\ndata: {"type":"stage1_complete","data":[]}\n\n'
          ),
        })
        .mockResolvedValueOnce({
          done: true,
        }),
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      body: {
        getReader: () => mockReader,
      },
    });

    await api.sendMessageStream('conv-123', 'Test', onEvent);

    expect(onEvent).toHaveBeenCalledTimes(2);
  });

  it('should handle empty stream', async () => {
    const onEvent = vi.fn();

    const mockReader = {
      read: vi.fn().mockResolvedValueOnce({
        done: true,
      }),
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      body: {
        getReader: () => mockReader,
      },
    });

    await api.sendMessageStream('conv-123', 'Test', onEvent);

    expect(onEvent).not.toHaveBeenCalled();
  });
});

describe('API Edge Cases', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  it('should handle network timeout', async () => {
    fetch.mockImplementationOnce(() => 
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 100)
      )
    );

    await expect(api.listConversations()).rejects.toThrow('Timeout');
  });

  it('should handle JSON parse errors', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => {
        throw new Error('Invalid JSON');
      },
    });

    await expect(api.listConversations()).rejects.toThrow('Invalid JSON');
  });

  it('should use correct API base URL', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    await api.listConversations();

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('http://localhost:8001')
    );
  });
});