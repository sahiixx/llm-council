import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api } from '../api';

describe('API Client', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('listConversations', () => {
    it('fetches conversations successfully', async () => {
      const mockConversations = [
        { id: '1', title: 'Conv 1', message_count: 2 },
        { id: '2', title: 'Conv 2', message_count: 5 },
      ];

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockConversations,
      });

      const result = await api.listConversations();

      expect(fetch).toHaveBeenCalledWith('http://localhost:8001/api/conversations');
      expect(result).toEqual(mockConversations);
    });

    it('throws error on failed request', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
      });

      await expect(api.listConversations()).rejects.toThrow('Failed to list conversations');
    });
  });

  describe('createConversation', () => {
    it('creates conversation successfully', async () => {
      const mockConversation = {
        id: 'new-id',
        created_at: '2024-01-01',
        title: 'New',
        messages: [],
      };

      global.fetch.mockResolvedValueOnce({
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

    it('throws error on failed creation', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
      });

      await expect(api.createConversation()).rejects.toThrow('Failed to create conversation');
    });
  });

  describe('getConversation', () => {
    it('fetches conversation by ID', async () => {
      const mockConversation = {
        id: 'test-id',
        title: 'Test',
        messages: [],
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockConversation,
      });

      const result = await api.getConversation('test-id');

      expect(fetch).toHaveBeenCalledWith('http://localhost:8001/api/conversations/test-id');
      expect(result).toEqual(mockConversation);
    });
  });

  describe('sendMessage', () => {
    it('sends message successfully', async () => {
      const mockResponse = {
        stage1: [],
        stage2: [],
        stage3: { response: 'Final' },
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await api.sendMessage('conv-id', 'Hello');

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8001/api/conversations/conv-id/message',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: 'Hello' }),
        }
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('sendMessageStream', () => {
    it('streams events correctly', async () => {
      const events = [];
      const onEvent = vi.fn((type, event) => events.push({ type, event }));

      const mockReader = {
        read: vi
          .fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: {"type":"stage1_start"}\n\n'),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: {"type":"complete"}\n\n'),
          })
          .mockResolvedValueOnce({ done: true }),
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        body: { getReader: () => mockReader },
      });

      await api.sendMessageStream('conv-id', 'Test', onEvent);

      expect(onEvent).toHaveBeenCalledWith('stage1_start', { type: 'stage1_start' });
      expect(onEvent).toHaveBeenCalledWith('complete', { type: 'complete' });
    });

    it('handles malformed SSE data gracefully', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      const onEvent = vi.fn();

      const mockReader = {
        read: vi
          .fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: invalid json\n\n'),
          })
          .mockResolvedValueOnce({ done: true }),
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        body: { getReader: () => mockReader },
      });

      await api.sendMessageStream('conv-id', 'Test', onEvent);

      expect(consoleError).toHaveBeenCalledWith(
        'Failed to parse SSE event:',
        expect.any(Error)
      );

      consoleError.mockRestore();
    });
  });
});