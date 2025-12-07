/**
 * Comprehensive unit tests for frontend/src/api.js
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { api } from './api';

// Mock fetch globally
global.fetch = vi.fn();

describe('API Client', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  describe('listConversations', () => {
    it('should fetch and return conversations list', async () => {
      const mockConversations = [
        { id: '1', title: 'Conv 1', message_count: 2 },
        { id: '2', title: 'Conv 2', message_count: 5 }
      ];

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockConversations
      });

      const result = await api.listConversations();

      expect(fetch).toHaveBeenCalledWith('http://localhost:8001/api/conversations');
      expect(result).toEqual(mockConversations);
    });

    it('should throw error when response is not ok', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      });

      await expect(api.listConversations()).rejects.toThrow('Failed to list conversations');
    });

    it('should handle empty conversation list', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      const result = await api.listConversations();
      expect(result).toEqual([]);
    });

    it('should handle network errors', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(api.listConversations()).rejects.toThrow('Network error');
    });
  });

  describe('createConversation', () => {
    it('should create a new conversation', async () => {
      const mockConversation = {
        id: 'new-123',
        created_at: '2024-01-01T00:00:00',
        title: 'New Conversation',
        messages: []
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockConversation
      });

      const result = await api.createConversation();

      expect(fetch).toHaveBeenCalledWith('http://localhost:8001/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });
      expect(result).toEqual(mockConversation);
    });

    it('should throw error when creation fails', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      });

      await expect(api.createConversation()).rejects.toThrow('Failed to create conversation');
    });

    it('should handle server errors during creation', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Server error'));

      await expect(api.createConversation()).rejects.toThrow('Server error');
    });
  });

  describe('getConversation', () => {
    it('should fetch a specific conversation', async () => {
      const mockConversation = {
        id: 'test-123',
        title: 'Test Conv',
        messages: [{ role: 'user', content: 'Hello' }]
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockConversation
      });

      const result = await api.getConversation('test-123');

      expect(fetch).toHaveBeenCalledWith('http://localhost:8001/api/conversations/test-123');
      expect(result).toEqual(mockConversation);
    });

    it('should throw error for non-existent conversation', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      await expect(api.getConversation('nonexistent')).rejects.toThrow('Failed to get conversation');
    });

    it('should handle special characters in conversation ID', async () => {
      const mockConversation = { id: 'test_123-abc', title: 'Test', messages: [] };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockConversation
      });

      const result = await api.getConversation('test_123-abc');
      expect(result).toEqual(mockConversation);
    });
  });

  describe('sendMessage', () => {
    it('should send a message and return response', async () => {
      const mockResponse = {
        stage1: [{ model: 'm1', response: 'R1' }],
        stage2: [{ model: 'm1', ranking: 'Ranking' }],
        stage3: { model: 'chairman', response: 'Final' },
        metadata: {}
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await api.sendMessage('conv-123', 'Test message');

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8001/api/conversations/conv-123/message',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ content: 'Test message' })
        }
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle empty message content', async () => {
      const mockResponse = { stage1: [], stage2: [], stage3: {}, metadata: {} };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await api.sendMessage('conv-123', '');
      expect(result).toEqual(mockResponse);
    });

    it('should handle Unicode in message content', async () => {
      const mockResponse = { stage1: [], stage2: [], stage3: {}, metadata: {} };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await api.sendMessage('conv-123', 'Hello 世界 🌍');
      expect(result).toEqual(mockResponse);
    });

    it('should throw error when message send fails', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      });

      await expect(api.sendMessage('conv-123', 'Test')).rejects.toThrow('Failed to send message');
    });
  });

  describe('sendMessageStream', () => {
    it('should stream message events', async () => {
      const mockEvents = [
        { type: 'stage1_start' },
        { type: 'stage1_complete', data: [] },
        { type: 'stage2_start' },
        { type: 'stage2_complete', data: [] },
        { type: 'stage3_start' },
        { type: 'stage3_complete', data: {} },
        { type: 'complete' }
      ];

      const receivedEvents = [];
      const onEvent = (type, event) => {
        receivedEvents.push({ type, event });
      };

      // Create a mock ReadableStream
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          mockEvents.forEach(event => {
            const data = `data: ${JSON.stringify(event)}\n\n`;
            controller.enqueue(encoder.encode(data));
          });
          controller.close();
        }
      });

      global.fetch.mockResolvedValueOnce({
        ok: true,
        body: stream
      });

      await api.sendMessageStream('conv-123', 'Test message', onEvent);

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8001/api/conversations/conv-123/message/stream',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ content: 'Test message' })
        }
      );

      expect(receivedEvents.length).toBeGreaterThan(0);
      expect(receivedEvents[0].type).toBe('stage1_start');
    });

    it('should handle streaming errors gracefully', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      });

      await expect(
        api.sendMessageStream('conv-123', 'Test', () => {})
      ).rejects.toThrow('Failed to send message');
    });

    it('should handle malformed SSE data', async () => {
      const receivedEvents = [];
      const onEvent = (type, event) => {
        receivedEvents.push({ type, event });
      };

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          // Send malformed JSON
          controller.enqueue(encoder.encode('data: {invalid json}\n\n'));
          // Send valid JSON
          controller.enqueue(encoder.encode('data: {"type": "test"}\n\n'));
          controller.close();
        }
      });

      global.fetch.mockResolvedValueOnce({
        ok: true,
        body: stream
      });

      // Mock console.error to suppress error logs in test output
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await api.sendMessageStream('conv-123', 'Test', onEvent);

      // Should have logged error for malformed JSON
      expect(consoleErrorSpy).toHaveBeenCalled();
      // Should still process valid event
      expect(receivedEvents.length).toBeGreaterThan(0);

      consoleErrorSpy.mockRestore();
    });

    it('should handle empty stream', async () => {
      const onEvent = vi.fn();

      const stream = new ReadableStream({
        start(controller) {
          controller.close();
        }
      });

      global.fetch.mockResolvedValueOnce({
        ok: true,
        body: stream
      });

      await api.sendMessageStream('conv-123', 'Test', onEvent);

      // Should complete without errors even with empty stream
      expect(onEvent).not.toHaveBeenCalled();
    });

    it('should process multiple events in single chunk', async () => {
      const receivedEvents = [];
      const onEvent = (type, event) => {
        receivedEvents.push({ type, event });
      };

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          // Send multiple events in one chunk
          const chunk = 'data: {"type": "event1"}\n\ndata: {"type": "event2"}\n\n';
          controller.enqueue(encoder.encode(chunk));
          controller.close();
        }
      });

      global.fetch.mockResolvedValueOnce({
        ok: true,
        body: stream
      });

      await api.sendMessageStream('conv-123', 'Test', onEvent);

      expect(receivedEvents.length).toBe(2);
      expect(receivedEvents[0].type).toBe('event1');
      expect(receivedEvents[1].type).toBe('event2');
    });
  });

  describe('API Base URL Configuration', () => {
    it('should use correct base URL for all endpoints', () => {
      expect(fetch).not.toHaveBeenCalled();

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({})
      });

      api.listConversations();
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('http://localhost:8001'));
    });
  });
});