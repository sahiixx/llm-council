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
    it('fetches conversations successfully', async () => {
      const mockConversations = [
        { id: 'conv-1', title: 'Test 1', message_count: 2 },
        { id: 'conv-2', title: 'Test 2', message_count: 4 },
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockConversations,
      });

      const result = await api.listConversations();

      expect(fetch).toHaveBeenCalledWith('http://localhost:8001/api/conversations');
      expect(result).toEqual(mockConversations);
    });

    it('throws error on failed request', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(api.listConversations()).rejects.toThrow('Failed to list conversations');
    });

    it('handles network errors', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(api.listConversations()).rejects.toThrow('Network error');
    });
  });

  describe('createConversation', () => {
    it('creates conversation successfully', async () => {
      const mockConversation = {
        id: 'new-conv',
        created_at: '2024-01-01',
        title: 'New Conversation',
        messages: [],
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockConversation,
      });

      const result = await api.createConversation();

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8001/api/conversations',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }
      );
      expect(result).toEqual(mockConversation);
    });

    it('throws error on failed creation', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
      });

      await expect(api.createConversation()).rejects.toThrow('Failed to create conversation');
    });
  });

  describe('getConversation', () => {
    it('fetches specific conversation successfully', async () => {
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

    it('throws error when conversation not found', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      await expect(api.getConversation('nonexistent')).rejects.toThrow('Failed to get conversation');
    });

    it('handles special characters in conversation ID', async () => {
      const specialId = 'conv-123_test.id';

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: specialId }),
      });

      await api.getConversation(specialId);

      expect(fetch).toHaveBeenCalledWith(`http://localhost:8001/api/conversations/${specialId}`);
    });
  });

  describe('sendMessage', () => {
    it('sends message successfully', async () => {
      const mockResponse = {
        stage1: [],
        stage2: [],
        stage3: { model: 'test', response: 'Answer' },
        metadata: {},
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await api.sendMessage('conv-123', 'Hello, world!');

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8001/api/conversations/conv-123/message',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: 'Hello, world!' }),
        }
      );
      expect(result).toEqual(mockResponse);
    });

    it('throws error on failed send', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(api.sendMessage('conv-123', 'Test')).rejects.toThrow('Failed to send message');
    });

    it('handles empty message content', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await api.sendMessage('conv-123', '');

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({ content: '' }),
        })
      );
    });

    it('handles unicode content', async () => {
      const unicodeContent = 'Hello 世界 🌍';

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await api.sendMessage('conv-123', unicodeContent);

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({ content: unicodeContent }),
        })
      );
    });
  });

  describe('sendMessageStream', () => {
    it('streams messages successfully', async () => {
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

      const events = [];
      const onEvent = (type, event) => events.push({ type, event });

      await api.sendMessageStream('conv-123', 'Test message', onEvent);

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8001/api/conversations/conv-123/message/stream',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: 'Test message' }),
        }
      );

      expect(events).toHaveLength(3);
      expect(events[0].type).toBe('stage1_start');
      expect(events[1].type).toBe('stage1_complete');
      expect(events[2].type).toBe('complete');
    });

    it('handles streaming errors', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(
        api.sendMessageStream('conv-123', 'Test', () => {})
      ).rejects.toThrow('Failed to send message');
    });

    it('handles malformed SSE data', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      
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

      const onEvent = vi.fn();
      await api.sendMessageStream('conv-123', 'Test', onEvent);

      expect(consoleError).toHaveBeenCalledWith(
        'Failed to parse SSE event:',
        expect.any(Error)
      );
      
      consoleError.mockRestore();
    });

    it('handles multiple events in single chunk', async () => {
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

      const events = [];
      await api.sendMessageStream('conv-123', 'Test', (type) => events.push(type));

      expect(events).toContain('stage1_start');
      expect(events).toContain('stage1_complete');
    });

    it('handles empty stream', async () => {
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

      const onEvent = vi.fn();
      await api.sendMessageStream('conv-123', 'Test', onEvent);

      expect(onEvent).not.toHaveBeenCalled();
    });
  });

  describe('API Base URL', () => {
    it('uses correct base URL for all endpoints', async () => {
      const endpoints = [
        { method: api.listConversations, expectedUrl: 'http://localhost:8001/api/conversations' },
        { method: api.createConversation, expectedUrl: 'http://localhost:8001/api/conversations' },
      ];

      for (const { method, expectedUrl } of endpoints) {
        fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({}),
        });

        try {
          await method();
        } catch (e) {
          // Ignore errors, we're just checking the URL
        }

        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('http://localhost:8001'),
          expect.any(Object)
        );
      }
    });
  });
});