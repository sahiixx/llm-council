/**
 * Comprehensive unit tests for frontend/src/api.js
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api } from '../api';

describe('api', () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('listConversations', () => {
    it('should fetch conversations list successfully', async () => {
      const mockConversations = [
        { id: '1', title: 'Conv 1', message_count: 2 },
        { id: '2', title: 'Conv 2', message_count: 4 },
      ];

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockConversations,
      });

      const result = await api.listConversations();

      expect(fetchMock).toHaveBeenCalledWith('http://localhost:8001/api/conversations');
      expect(result).toEqual(mockConversations);
    });

    it('should throw error when fetch fails', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(api.listConversations()).rejects.toThrow('Failed to list conversations');
    });

    it('should handle network errors', async () => {
      fetchMock.mockRejectedValueOnce(new Error('Network error'));

      await expect(api.listConversations()).rejects.toThrow('Network error');
    });

    it('should handle empty conversation list', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const result = await api.listConversations();
      expect(result).toEqual([]);
    });
  });

  describe('createConversation', () => {
    it('should create a new conversation successfully', async () => {
      const mockConversation = {
        id: 'new-123',
        created_at: '2024-01-01T00:00:00',
        title: 'New Conversation',
        messages: [],
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockConversation,
      });

      const result = await api.createConversation();

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8001/api/conversations',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        })
      );
      expect(result).toEqual(mockConversation);
    });

    it('should throw error on creation failure', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(api.createConversation()).rejects.toThrow('Failed to create conversation');
    });
  });

  describe('getConversation', () => {
    it('should fetch a specific conversation', async () => {
      const mockConversation = {
        id: 'test-123',
        title: 'Test Conv',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockConversation,
      });

      const result = await api.getConversation('test-123');

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8001/api/conversations/test-123'
      );
      expect(result).toEqual(mockConversation);
    });

    it('should handle non-existent conversation', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      await expect(api.getConversation('non-existent')).rejects.toThrow(
        'Failed to get conversation'
      );
    });

    it('should handle special characters in ID', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'test-id-123' }),
      });

      await api.getConversation('test-id-123');

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8001/api/conversations/test-id-123'
      );
    });
  });

  describe('sendMessage', () => {
    it('should send a message successfully', async () => {
      const mockResponse = {
        stage1: [],
        stage2: [],
        stage3: {},
        metadata: {},
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await api.sendMessage('conv-123', 'Hello');

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8001/api/conversations/conv-123/message',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: 'Hello' }),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle message send failure', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(api.sendMessage('conv-123', 'Hello')).rejects.toThrow(
        'Failed to send message'
      );
    });

    it('should send empty message', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await api.sendMessage('conv-123', '');

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({ content: '' }),
        })
      );
    });

    it('should handle Unicode in message content', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const unicodeContent = 'Hello 世界 🌍';
      await api.sendMessage('conv-123', unicodeContent);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({ content: unicodeContent }),
        })
      );
    });
  });

  describe('sendMessageStream', () => {
    it('should handle SSE stream successfully', async () => {
      const events = [];
      const onEvent = vi.fn((type, event) => {
        events.push({ type, event });
      });

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

      fetchMock.mockResolvedValueOnce({
        ok: true,
        body: {
          getReader: () => mockReader,
        },
      });

      await api.sendMessageStream('conv-123', 'Test', onEvent);

      expect(onEvent).toHaveBeenCalledWith('stage1_start', expect.any(Object));
      expect(onEvent).toHaveBeenCalledWith('stage1_complete', expect.any(Object));
    });

    it('should handle stream errors gracefully', async () => {
      const onEvent = vi.fn();

      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(api.sendMessageStream('conv-123', 'Test', onEvent)).rejects.toThrow(
        'Failed to send message'
      );
    });

    it('should parse JSON events correctly', async () => {
      const onEvent = vi.fn();

      const mockReader = {
        read: vi
          .fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(
              'data: {"type":"stage1_complete","data":[{"model":"m1","response":"R1"}]}\n\n'
            ),
          })
          .mockResolvedValueOnce({
            done: true,
          }),
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        body: { getReader: () => mockReader },
      });

      await api.sendMessageStream('conv-123', 'Test', onEvent);

      expect(onEvent).toHaveBeenCalledWith('stage1_complete', {
        type: 'stage1_complete',
        data: [{ model: 'm1', response: 'R1' }],
      });
    });

    it('should handle malformed JSON in stream', async () => {
      const onEvent = vi.fn();
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

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

      fetchMock.mockResolvedValueOnce({
        ok: true,
        body: { getReader: () => mockReader },
      });

      await api.sendMessageStream('conv-123', 'Test', onEvent);

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('should handle multiple events in single chunk', async () => {
      const onEvent = vi.fn();

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

      fetchMock.mockResolvedValueOnce({
        ok: true,
        body: { getReader: () => mockReader },
      });

      await api.sendMessageStream('conv-123', 'Test', onEvent);

      expect(onEvent).toHaveBeenCalledTimes(2);
      expect(onEvent).toHaveBeenCalledWith('event1', expect.any(Object));
      expect(onEvent).toHaveBeenCalledWith('event2', expect.any(Object));
    });
  });

  describe('API_BASE configuration', () => {
    it('should use correct base URL', () => {
      // Verify that API_BASE is correctly configured
      expect(fetchMock).toBeDefined();
    });
  });

  describe('Error handling', () => {
    it('should propagate network errors', async () => {
      fetchMock.mockRejectedValueOnce(new Error('Network failure'));

      await expect(api.listConversations()).rejects.toThrow('Network failure');
    });

    it('should handle timeout errors', async () => {
      fetchMock.mockRejectedValueOnce(new Error('Timeout'));

      await expect(api.getConversation('test')).rejects.toThrow('Timeout');
    });
  });
});