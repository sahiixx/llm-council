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
    it('should fetch conversations successfully', async () => {
      const mockConversations = [
        { id: '1', title: 'Test 1', created_at: '2024-01-01', message_count: 2 },
        { id: '2', title: 'Test 2', created_at: '2024-01-02', message_count: 1 },
      ];
      
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockConversations,
      });
      
      const result = await api.listConversations();
      
      expect(global.fetch).toHaveBeenCalledWith('http://localhost:8001/api/conversations');
      expect(result).toEqual(mockConversations);
    });

    it('should throw error on failed request', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });
      
      await expect(api.listConversations()).rejects.toThrow('Failed to list conversations');
    });

    it('should handle network errors', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));
      
      await expect(api.listConversations()).rejects.toThrow('Network error');
    });
  });

  describe('createConversation', () => {
    it('should create new conversation successfully', async () => {
      const mockConv = {
        id: 'new-123',
        created_at: '2024-01-01T00:00:00',
        title: 'New Conversation',
        messages: [],
      };
      
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockConv,
      });
      
      const result = await api.createConversation();
      
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8001/api/conversations',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
      expect(result).toEqual(mockConv);
    });

    it('should send empty object in body', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });
      
      await api.createConversation();
      
      const callArgs = global.fetch.mock.calls[0][1];
      expect(JSON.parse(callArgs.body)).toEqual({});
    });

    it('should throw error on failed creation', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
      });
      
      await expect(api.createConversation()).rejects.toThrow();
    });
  });

  describe('getConversation', () => {
    it('should fetch specific conversation', async () => {
      const mockConv = {
        id: 'conv-123',
        title: 'Test',
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

    it('should handle non-existent conversation', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });
      
      await expect(api.getConversation('nonexistent')).rejects.toThrow();
    });

    it('should encode conversation ID in URL', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });
      
      await api.getConversation('test-123-abc');
      
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8001/api/conversations/test-123-abc'
      );
    });
  });

  describe('sendMessage', () => {
    it('should send message successfully', async () => {
      const mockResponse = {
        stage1: [],
        stage2: [],
        stage3: { model: 'm', response: 'r' },
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
          body: JSON.stringify({ content: 'Test message' }),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should include content in request body', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });
      
      await api.sendMessage('conv-123', 'My test message');
      
      const callArgs = global.fetch.mock.calls[0][1];
      const body = JSON.parse(callArgs.body);
      expect(body.content).toBe('My test message');
    });

    it('should handle empty message content', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });
      
      await api.sendMessage('conv-123', '');
      
      const callArgs = global.fetch.mock.calls[0][1];
      const body = JSON.parse(callArgs.body);
      expect(body.content).toBe('');
    });
  });

  describe('sendMessageStream', () => {
    it('should handle streaming response', async () => {
      const mockEvents = [
        'data: {"type":"stage1_start"}\n',
        'data: {"type":"stage1_complete","data":[]}\n',
        'data: {"type":"complete"}\n',
      ];
      
      const mockReader = {
        read: vi.fn()
          .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode(mockEvents[0]) })
          .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode(mockEvents[1]) })
          .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode(mockEvents[2]) })
          .mockResolvedValueOnce({ done: true }),
      };
      
      global.fetch.mockResolvedValueOnce({
        ok: true,
        body: {
          getReader: () => mockReader,
        },
      });
      
      const events = [];
      const onEvent = (type, data) => {
        events.push({ type, data });
      };
      
      await api.sendMessageStream('conv-123', 'Test', onEvent);
      
      expect(events.length).toBeGreaterThan(0);
      expect(events.some(e => e.type === 'stage1_start')).toBe(true);
    });

    it('should parse JSON events correctly', async () => {
      const mockEvent = 'data: {"type":"stage1_complete","data":[{"model":"m1","response":"R1"}]}\n';
      
      const mockReader = {
        read: vi.fn()
          .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode(mockEvent) })
          .mockResolvedValueOnce({ done: true }),
      };
      
      global.fetch.mockResolvedValueOnce({
        ok: true,
        body: {
          getReader: () => mockReader,
        },
      });
      
      const events = [];
      await api.sendMessageStream('conv-123', 'Test', (type, event) => {
        events.push(event);
      });
      
      expect(events.some(e => e.type === 'stage1_complete')).toBe(true);
    });

    it('should handle malformed JSON gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const mockEvent = 'data: {invalid json}\n';
      
      const mockReader = {
        read: vi.fn()
          .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode(mockEvent) })
          .mockResolvedValueOnce({ done: true }),
      };
      
      global.fetch.mockResolvedValueOnce({
        ok: true,
        body: {
          getReader: () => mockReader,
        },
      });
      
      await api.sendMessageStream('conv-123', 'Test', () => {});
      
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should throw on failed stream request', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
      });
      
      await expect(
        api.sendMessageStream('conv-123', 'Test', () => {})
      ).rejects.toThrow();
    });
  });

  describe('URL Construction', () => {
    it('should use correct base URL', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });
      
      await api.listConversations();
      
      const url = global.fetch.mock.calls[0][0];
      expect(url).toContain('http://localhost:8001');
    });

    it('should construct correct endpoint paths', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });
      
      await api.getConversation('test-id');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/conversations/test-id')
      );
      
      await api.sendMessage('test-id', 'msg');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/conversations/test-id/message')
      );
    });
  });
});