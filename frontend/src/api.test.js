/**
 * Comprehensive unit tests for frontend/src/api.js
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { api } from './api';

global.fetch = vi.fn();

describe('API Client', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  describe('listConversations', () => {
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

  describe('createConversation', () => {
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

    it('should handle server errors gracefully', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
      });

      await expect(api.createConversation()).rejects.toThrow();
    });
  });

  describe('getConversation', () => {
    it('should fetch specific conversation', async () => {
      const mockConversation = {
        id: 'conv-123',
        title: 'My Conversation',
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

    it('should handle conversation with many messages', async () => {
      const messages = Array(100).fill(null).map((_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`,
      }));

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'conv-1', messages }),
      });

      const result = await api.getConversation('conv-1');
      expect(result.messages).toHaveLength(100);
    });

    it('should handle special characters in conversation ID', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'conv-with-dashes-123' }),
      });

      await api.getConversation('conv-with-dashes-123');
      expect(fetch).toHaveBeenCalledWith('http://localhost:8001/api/conversations/conv-with-dashes-123');
    });
  });

  describe('sendMessage', () => {
    it('should send message successfully', async () => {
      const mockResponse = {
        stage1: [],
        stage2: [],
        stage3: {},
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

    it('should throw error on failed send', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(api.sendMessage('conv-123', 'Hello')).rejects.toThrow('Failed to send message');
    });

    it('should handle empty message content', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await api.sendMessage('conv-123', '');
      expect(fetch).toHaveBeenCalled();
    });

    it('should handle very long message content', async () => {
      const longMessage = 'A'.repeat(10000);
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await api.sendMessage('conv-123', longMessage);
      const callBody = JSON.parse(fetch.mock.calls[0][1].body);
      expect(callBody.content).toBe(longMessage);
    });

    it('should handle Unicode characters in message', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await api.sendMessage('conv-123', 'Hello 你好 café 🎉');
      const callBody = JSON.parse(fetch.mock.calls[0][1].body);
      expect(callBody.content).toContain('你好');
    });
  });

  describe('sendMessageStream', () => {
    it('should handle streaming events successfully', async () => {
      const events = [];
      const onEvent = vi.fn((type, data) => {
        events.push({ type, data });
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

      await api.sendMessageStream('conv-123', 'Hello', onEvent);

      expect(onEvent).toHaveBeenCalledTimes(2);
      expect(onEvent).toHaveBeenCalledWith('stage1_start', expect.any(Object));
      expect(onEvent).toHaveBeenCalledWith('stage1_complete', expect.any(Object));
    });

    it('should throw error on failed stream request', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(
        api.sendMessageStream('conv-123', 'Hello', vi.fn())
      ).rejects.toThrow('Failed to send message');
    });

    it('should handle malformed JSON in stream', async () => {
      const onEvent = vi.fn();
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const mockReader = {
        read: vi.fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: {invalid json}\n\n'),
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

      await api.sendMessageStream('conv-123', 'Hello', onEvent);

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(onEvent).not.toHaveBeenCalled();
      
      consoleErrorSpy.mockRestore();
    });

    it('should handle multiple events in single chunk', async () => {
      const onEvent = vi.fn();

      const mockReader = {
        read: vi.fn()
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

      fetch.mockResolvedValueOnce({
        ok: true,
        body: {
          getReader: () => mockReader,
        },
      });

      await api.sendMessageStream('conv-123', 'Hello', onEvent);

      expect(onEvent).toHaveBeenCalledTimes(2);
      expect(onEvent).toHaveBeenNthCalledWith(1, 'event1', expect.any(Object));
      expect(onEvent).toHaveBeenNthCalledWith(2, 'event2', expect.any(Object));
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

      await api.sendMessageStream('conv-123', 'Hello', onEvent);

      expect(onEvent).not.toHaveBeenCalled();
    });

    it('should parse complete event cycle', async () => {
      const events = [];
      const onEvent = vi.fn((type, data) => {
        events.push(type);
      });

      const mockReader = {
        read: vi.fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: {"type":"stage1_start"}\n\n'),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: {"type":"stage1_complete"}\n\n'),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: {"type":"stage2_start"}\n\n'),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: {"type":"stage2_complete"}\n\n'),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: {"type":"stage3_start"}\n\n'),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: {"type":"stage3_complete"}\n\n'),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: {"type":"complete"}\n\n'),
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

      await api.sendMessageStream('conv-123', 'Hello', onEvent);

      expect(events).toContain('stage1_start');
      expect(events).toContain('stage2_start');
      expect(events).toContain('stage3_start');
      expect(events).toContain('complete');
    });
  });

  describe('API Base URL', () => {
    it('should use correct base URL', () => {
      // Verify API_BASE is correctly set
      expect(fetch).not.toHaveBeenCalled();
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      api.listConversations();
      
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('http://localhost:8001'));
    });
  });

  describe('Error Handling', () => {
    it('should handle timeout errors', async () => {
      fetch.mockImplementationOnce(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
      );

      await expect(api.listConversations()).rejects.toThrow('Timeout');
    });

    it('should handle CORS errors', async () => {
      fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      await expect(api.listConversations()).rejects.toThrow('Failed to fetch');
    });

    it('should handle 401 unauthorized', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      await expect(api.listConversations()).rejects.toThrow();
    });

    it('should handle 403 forbidden', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
      });

      await expect(api.getConversation('conv-1')).rejects.toThrow();
    });

    it('should handle 500 server error', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(api.sendMessage('conv-1', 'test')).rejects.toThrow();
    });
  });
});