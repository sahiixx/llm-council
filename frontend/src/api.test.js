import { describe, it, expect, beforeEach, vi } from 'vitest';
import { api } from './api';

describe('api', () => {
  beforeEach(() => {
    // Reset fetch mock before each test
    global.fetch = vi.fn();
  });

  describe('listConversations', () => {
    it('should fetch conversations list successfully', async () => {
      const mockConversations = [
        { id: '1', title: 'Test 1', message_count: 5 },
        { id: '2', title: 'Test 2', message_count: 3 },
      ];

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockConversations,
      });

      const result = await api.listConversations();

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8001/api/conversations'
      );
      expect(result).toEqual(mockConversations);
    });

    it('should throw error when fetch fails', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(api.listConversations()).rejects.toThrow(
        'Failed to list conversations'
      );
    });

    it('should handle network errors', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(api.listConversations()).rejects.toThrow('Network error');
    });

    it('should handle empty conversations list', async () => {
      global.fetch.mockResolvedValueOnce({
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
        id: 'new-conv-id',
        created_at: '2024-01-01T00:00:00',
        title: 'New Conversation',
        messages: [],
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockConversation,
      });

      const result = await api.createConversation();

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8001/api/conversations',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        }
      );
      expect(result).toEqual(mockConversation);
    });

    it('should throw error when creation fails', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(api.createConversation()).rejects.toThrow(
        'Failed to create conversation'
      );
    });

    it('should send correct headers', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: '1', messages: [] }),
      });

      await api.createConversation();

      const callArgs = global.fetch.mock.calls[0][1];
      expect(callArgs.headers['Content-Type']).toBe('application/json');
    });
  });

  describe('getConversation', () => {
    it('should fetch a specific conversation successfully', async () => {
      const mockConversation = {
        id: 'conv-123',
        title: 'Test Conversation',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockConversation,
      });

      const result = await api.getConversation('conv-123');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8001/api/conversations/conv-123'
      );
      expect(result).toEqual(mockConversation);
    });

    it('should throw error when conversation not found', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      await expect(api.getConversation('nonexistent')).rejects.toThrow(
        'Failed to get conversation'
      );
    });

    it('should handle special characters in conversation ID', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'test-123-abc', messages: [] }),
      });

      await api.getConversation('test-123-abc');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8001/api/conversations/test-123-abc'
      );
    });
  });

  describe('sendMessage', () => {
    it('should send a message successfully', async () => {
      const mockResponse = {
        stage1: [],
        stage2: [],
        stage3: { model: 'chairman', response: 'Answer' },
        metadata: {},
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await api.sendMessage('conv-123', 'Hello');

      expect(global.fetch).toHaveBeenCalledWith(
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

    it('should throw error when sending fails', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      await expect(api.sendMessage('conv-123', 'Test')).rejects.toThrow(
        'Failed to send message'
      );
    });

    it('should handle empty message content', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ stage1: [], stage2: [], stage3: {} }),
      });

      await api.sendMessage('conv-123', '');

      const callArgs = global.fetch.mock.calls[0][1];
      const body = JSON.parse(callArgs.body);
      expect(body.content).toBe('');
    });

    it('should handle unicode characters in message', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ stage1: [], stage2: [], stage3: {} }),
      });

      const unicodeMessage = 'Hello 你好 café 🎉';
      await api.sendMessage('conv-123', unicodeMessage);

      const callArgs = global.fetch.mock.calls[0][1];
      const body = JSON.parse(callArgs.body);
      expect(body.content).toBe(unicodeMessage);
    });
  });

  describe('sendMessageStream', () => {
    it('should stream messages and call onEvent callback', async () => {
      const mockEvents = [
        { type: 'stage1_start' },
        { type: 'stage1_complete', data: [] },
        { type: 'complete' },
      ];

      const mockReader = {
        read: vi
          .fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(
              'data: ' + JSON.stringify(mockEvents[0]) + '\n\n'
            ),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(
              'data: ' + JSON.stringify(mockEvents[1]) + '\n\n'
            ),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(
              'data: ' + JSON.stringify(mockEvents[2]) + '\n\n'
            ),
          })
          .mockResolvedValueOnce({ done: true }),
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        body: {
          getReader: () => mockReader,
        },
      });

      const events = [];
      const onEvent = vi.fn((type, data) => {
        events.push({ type, data });
      });

      await api.sendMessageStream('conv-123', 'Hello', onEvent);

      expect(onEvent).toHaveBeenCalledTimes(3);
      expect(events[0].type).toBe('stage1_start');
      expect(events[1].type).toBe('stage1_complete');
      expect(events[2].type).toBe('complete');
    });

    it('should throw error when stream fails to start', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const onEvent = vi.fn();

      await expect(
        api.sendMessageStream('conv-123', 'Test', onEvent)
      ).rejects.toThrow('Failed to send message');
    });

    it('should handle malformed SSE data gracefully', async () => {
      const mockReader = {
        read: vi
          .fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: {invalid json}\n\n'),
          })
          .mockResolvedValueOnce({ done: true }),
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        body: {
          getReader: () => mockReader,
        },
      });

      const onEvent = vi.fn();
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      await api.sendMessageStream('conv-123', 'Test', onEvent);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to parse SSE event:',
        expect.any(Error)
      );
      consoleErrorSpy.mockRestore();
    });

    it('should handle multiple events in single chunk', async () => {
      const mockReader = {
        read: vi
          .fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(
              'data: {"type":"event1"}\n\ndata: {"type":"event2"}\n\n'
            ),
          })
          .mockResolvedValueOnce({ done: true }),
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
      expect(onEvent).toHaveBeenCalledWith('event1', { type: 'event1' });
      expect(onEvent).toHaveBeenCalledWith('event2', { type: 'event2' });
    });

    it('should handle empty stream', async () => {
      const mockReader = {
        read: vi.fn().mockResolvedValueOnce({ done: true }),
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        body: {
          getReader: () => mockReader,
        },
      });

      const onEvent = vi.fn();
      await api.sendMessageStream('conv-123', 'Test', onEvent);

      expect(onEvent).not.toHaveBeenCalled();
    });
  });

  describe('API_BASE configuration', () => {
    it('should use correct base URL for all endpoints', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      await api.listConversations();
      await api.createConversation();
      await api.getConversation('123');
      await api.sendMessage('123', 'test');

      const calls = global.fetch.mock.calls;
      calls.forEach((call) => {
        expect(call[0]).toContain('http://localhost:8001');
      });
    });
  });
});