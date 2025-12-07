/**
 * Comprehensive unit tests for api.js
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api } from '../api';

// Mock global fetch
global.fetch = vi.fn();

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('listConversations', () => {
    it('fetches conversations from the correct endpoint', async () => {
      const mockConversations = [
        { id: '1', title: 'Conv 1', created_at: '2024-01-01', message_count: 2 },
      ];

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockConversations,
      });

      const result = await api.listConversations();

      expect(global.fetch).toHaveBeenCalledWith('http://localhost:8001/api/conversations');
      expect(result).toEqual(mockConversations);
    });

    it('throws error when response is not ok', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(api.listConversations()).rejects.toThrow('Failed to list conversations');
    });

    it('returns empty array when no conversations exist', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const result = await api.listConversations();
      expect(result).toEqual([]);
    });
  });

  describe('createConversation', () => {
    it('creates a conversation with POST request', async () => {
      const newConv = {
        id: 'new-id',
        title: 'New Conversation',
        created_at: '2024-01-01',
        messages: [],
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => newConv,
      });

      const result = await api.createConversation();

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8001/api/conversations',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        })
      );
      expect(result).toEqual(newConv);
    });

    it('throws error on failed creation', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
      });

      await expect(api.createConversation()).rejects.toThrow('Failed to create conversation');
    });
  });

  describe('getConversation', () => {
    it('fetches a specific conversation by ID', async () => {
      const mockConv = {
        id: 'conv-123',
        title: 'Test Conversation',
        created_at: '2024-01-01',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockConv,
      });

      const result = await api.getConversation('conv-123');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8001/api/conversations/conv-123'
      );
      expect(result).toEqual(mockConv);
    });

    it('throws error for non-existent conversation', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      await expect(api.getConversation('nonexistent')).rejects.toThrow(
        'Failed to get conversation'
      );
    });
  });

  describe('sendMessage', () => {
    it('sends a message to the conversation', async () => {
      const mockResponse = {
        stage1: [],
        stage2: [],
        stage3: {},
        metadata: {},
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await api.sendMessage('conv-123', 'Test message');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8001/api/conversations/conv-123/message',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: 'Test message' }),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('handles empty message content', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await api.sendMessage('conv-123', '');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({ content: '' }),
        })
      );
    });

    it('throws error on failed send', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
      });

      await expect(api.sendMessage('conv-123', 'Test')).rejects.toThrow(
        'Failed to send message'
      );
    });
  });

  describe('sendMessageStream', () => {
    it('processes server-sent events', async () => {
      const mockReader = {
        read: vi
          .fn()
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

      global.fetch.mockResolvedValueOnce({
        ok: true,
        body: {
          getReader: () => mockReader,
        },
      });

      const onEvent = vi.fn();
      await api.sendMessageStream('conv-123', 'Test', onEvent);

      expect(onEvent).toHaveBeenCalledWith('stage1_start', expect.objectContaining({ type: 'stage1_start' }));
      expect(onEvent).toHaveBeenCalledWith('stage1_complete', expect.objectContaining({ type: 'stage1_complete' }));
    });

    it('handles multiple events in single chunk', async () => {
      const mockReader = {
        read: vi
          .fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(
              'data: {"type":"event1"}\n\ndata: {"type":"event2"}\n\n'
            ),
          })
          .mockResolvedValueOnce({
            done: true,
          }),
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        body: {
          getReader: () => mockReader,
        },
      });

      const onEvent = vi.fn();
      await api.sendMessageStream('conv-123', 'Test', onEvent);

      expect(onEvent).toHaveBeenCalledTimes(2);
    });

    it('handles malformed JSON gracefully', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      const mockReader = {
        read: vi
          .fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: {invalid json}\n\n'),
          })
          .mockResolvedValueOnce({
            done: true,
          }),
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        body: {
          getReader: () => mockReader,
        },
      });

      const onEvent = vi.fn();
      await api.sendMessageStream('conv-123', 'Test', onEvent);

      expect(consoleError).toHaveBeenCalledWith(
        'Failed to parse SSE event:',
        expect.any(Error)
      );
      expect(onEvent).not.toHaveBeenCalled();

      consoleError.mockRestore();
    });

    it('throws error when stream request fails', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
      });

      await expect(api.sendMessageStream('conv-123', 'Test', vi.fn())).rejects.toThrow(
        'Failed to send message'
      );
    });

    it('processes empty lines without errors', async () => {
      const mockReader = {
        read: vi
          .fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('\n\ndata: {"type":"test"}\n\n\n'),
          })
          .mockResolvedValueOnce({
            done: true,
          }),
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        body: {
          getReader: () => mockReader,
        },
      });

      const onEvent = vi.fn();
      await api.sendMessageStream('conv-123', 'Test', onEvent);

      expect(onEvent).toHaveBeenCalledTimes(1);
    });

    it('handles unicode characters in stream', async () => {
      const mockReader = {
        read: vi
          .fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: {"type":"test","content":"Hello 世界 🌍"}\n\n'),
          })
          .mockResolvedValueOnce({
            done: true,
          }),
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        body: {
          getReader: () => mockReader,
        },
      });

      const onEvent = vi.fn();
      await api.sendMessageStream('conv-123', 'Test', onEvent);

      expect(onEvent).toHaveBeenCalledWith(
        'test',
        expect.objectContaining({ content: 'Hello 世界 🌍' })
      );
    });
  });

  describe('API Base URL', () => {
    it('uses correct base URL for all endpoints', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      await api.listConversations();
      await api.createConversation();
      await api.getConversation('123');
      await api.sendMessage('123', 'test');

      const calls = global.fetch.mock.calls;
      calls.forEach(([url]) => {
        expect(url).toContain('http://localhost:8001/api');
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles network errors', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(api.listConversations()).rejects.toThrow('Network error');
    });

    it('handles timeout errors', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Request timeout'));

      await expect(api.getConversation('123')).rejects.toThrow('Request timeout');
    });

    it('handles very large response data', async () => {
      const largeData = {
        id: 'large',
        messages: Array(1000).fill({ role: 'user', content: 'A'.repeat(1000) }),
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => largeData,
      });

      const result = await api.getConversation('large');
      expect(result.messages).toHaveLength(1000);
    });
  });
});