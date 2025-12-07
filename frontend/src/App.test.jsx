/**
 * Comprehensive unit tests for frontend/src/App.jsx
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { api } from './api';

// Mock the API module
vi.mock('./api');

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mocks
    api.listConversations.mockResolvedValue([]);
    api.createConversation.mockResolvedValue({
      id: 'new-conv',
      created_at: '2024-01-01T00:00:00',
      title: 'New Conversation',
      messages: [],
    });
    api.getConversation.mockResolvedValue({
      id: 'test-conv',
      title: 'Test',
      messages: [],
    });
  });

  it('should render without crashing', () => {
    render(<App />);
    expect(screen.getByText(/LLM Council/i)).toBeInTheDocument();
  });

  it('should load conversations on mount', async () => {
    const mockConvs = [
      { id: '1', title: 'Conv 1', created_at: '2024-01-01T00:00:00', message_count: 5 },
    ];
    api.listConversations.mockResolvedValue(mockConvs);

    render(<App />);

    await waitFor(() => {
      expect(api.listConversations).toHaveBeenCalledTimes(1);
    });
  });

  it('should handle create new conversation', async () => {
    api.listConversations.mockResolvedValue([]);
    api.createConversation.mockResolvedValue({
      id: 'new-id',
      created_at: '2024-01-01T00:00:00',
      title: 'New Conversation',
      messages: [],
    });

    render(<App />);

    const newButton = screen.getByText(/New Conversation/i);
    await userEvent.click(newButton);

    await waitFor(() => {
      expect(api.createConversation).toHaveBeenCalled();
    });
  });

  it('should select conversation when clicked', async () => {
    const mockConvs = [
      { id: 'conv-1', title: 'Test Conv', created_at: '2024-01-01T00:00:00', message_count: 2 },
    ];
    api.listConversations.mockResolvedValue(mockConvs);
    api.getConversation.mockResolvedValue({
      id: 'conv-1',
      title: 'Test Conv',
      messages: [],
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Test Conv')).toBeInTheDocument();
    });

    const convItem = screen.getByText('Test Conv');
    await userEvent.click(convItem);

    await waitFor(() => {
      expect(api.getConversation).toHaveBeenCalledWith('conv-1');
    });
  });

  it('should handle send message with streaming', async () => {
    api.listConversations.mockResolvedValue([]);
    api.createConversation.mockResolvedValue({
      id: 'new-conv',
      created_at: '2024-01-01T00:00:00',
      title: 'New Conversation',
      messages: [],
    });
    api.getConversation.mockResolvedValue({
      id: 'new-conv',
      title: 'New Conversation',
      messages: [],
    });
    api.sendMessageStream.mockImplementation(async (convId, content, onEvent) => {
      onEvent('stage1_start', { type: 'stage1_start' });
      onEvent('stage1_complete', { type: 'stage1_complete', data: [] });
      onEvent('complete', { type: 'complete' });
    });

    render(<App />);

    // Create conversation
    const newButton = screen.getByText(/New Conversation/i);
    await userEvent.click(newButton);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Ask your question/i)).toBeInTheDocument();
    });

    // Send message
    const textarea = screen.getByPlaceholderText(/Ask your question/i);
    await userEvent.type(textarea, 'Test question');

    const sendButton = screen.getByText('Send');
    await userEvent.click(sendButton);

    await waitFor(() => {
      expect(api.sendMessageStream).toHaveBeenCalled();
    });
  });

  it('should handle streaming events correctly', async () => {
    api.createConversation.mockResolvedValue({
      id: 'test-conv',
      created_at: '2024-01-01T00:00:00',
      title: 'Test',
      messages: [],
    });
    api.getConversation.mockResolvedValue({
      id: 'test-conv',
      title: 'Test',
      messages: [],
    });

    let capturedOnEvent;
    api.sendMessageStream.mockImplementation(async (convId, content, onEvent) => {
      capturedOnEvent = onEvent;
      onEvent('stage1_start', { type: 'stage1_start' });
      onEvent('stage1_complete', { 
        type: 'stage1_complete', 
        data: [{ model: 'm1', response: 'Response 1' }] 
      });
      onEvent('complete', { type: 'complete' });
    });

    render(<App />);

    const newButton = screen.getByText(/New Conversation/i);
    await userEvent.click(newButton);

    await waitFor(() => {
      const textarea = screen.getByPlaceholderText(/Ask your question/i);
      expect(textarea).toBeInTheDocument();
    });

    const textarea = screen.getByPlaceholderText(/Ask your question/i);
    await userEvent.type(textarea, 'Question');
    
    const sendButton = screen.getByText('Send');
    await userEvent.click(sendButton);

    await waitFor(() => {
      expect(capturedOnEvent).toBeDefined();
    });
  });

  it('should handle streaming errors', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    api.createConversation.mockResolvedValue({
      id: 'test-conv',
      created_at: '2024-01-01T00:00:00',
      title: 'Test',
      messages: [],
    });
    api.getConversation.mockResolvedValue({
      id: 'test-conv',
      title: 'Test',
      messages: [],
    });
    api.sendMessageStream.mockRejectedValue(new Error('Stream error'));

    render(<App />);

    const newButton = screen.getByText(/New Conversation/i);
    await userEvent.click(newButton);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Ask your question/i)).toBeInTheDocument();
    });

    const textarea = screen.getByPlaceholderText(/Ask your question/i);
    await userEvent.type(textarea, 'Question');
    
    const sendButton = screen.getByText('Send');
    await userEvent.click(sendButton);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    consoleErrorSpy.mockRestore();
  });

  it('should update conversation title on first message', async () => {
    api.createConversation.mockResolvedValue({
      id: 'test-conv',
      created_at: '2024-01-01T00:00:00',
      title: 'New Conversation',
      messages: [],
    });
    api.getConversation.mockResolvedValue({
      id: 'test-conv',
      title: 'New Conversation',
      messages: [],
    });
    api.sendMessageStream.mockImplementation(async (convId, content, onEvent) => {
      onEvent('title_complete', { type: 'title_complete', data: { title: 'Updated Title' } });
      onEvent('complete', { type: 'complete' });
    });

    render(<App />);

    const newButton = screen.getByText(/New Conversation/i);
    await userEvent.click(newButton);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Ask your question/i)).toBeInTheDocument();
    });

    const textarea = screen.getByPlaceholderText(/Ask your question/i);
    await userEvent.type(textarea, 'First question');
    
    const sendButton = screen.getByText('Send');
    await userEvent.click(sendButton);

    await waitFor(() => {
      expect(api.listConversations).toHaveBeenCalled();
    });
  });

  it('should disable send button while loading', async () => {
    api.createConversation.mockResolvedValue({
      id: 'test-conv',
      created_at: '2024-01-01T00:00:00',
      title: 'Test',
      messages: [],
    });
    api.getConversation.mockResolvedValue({
      id: 'test-conv',
      title: 'Test',
      messages: [],
    });
    
    // Make streaming take time
    api.sendMessageStream.mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    render(<App />);

    const newButton = screen.getByText(/New Conversation/i);
    await userEvent.click(newButton);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Ask your question/i)).toBeInTheDocument();
    });

    const textarea = screen.getByPlaceholderText(/Ask your question/i);
    await userEvent.type(textarea, 'Question');
    
    const sendButton = screen.getByText('Send');
    await userEvent.click(sendButton);

    // Button should be disabled while sending
    expect(sendButton).toBeDisabled();
  });

  it('should handle error loading conversations', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    api.listConversations.mockRejectedValue(new Error('Load error'));

    render(<App />);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to load conversations:',
        expect.any(Error)
      );
    });

    consoleErrorSpy.mockRestore();
  });

  it('should handle error creating conversation', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    api.createConversation.mockRejectedValue(new Error('Create error'));

    render(<App />);

    const newButton = screen.getByText(/New Conversation/i);
    await userEvent.click(newButton);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to create conversation:',
        expect.any(Error)
      );
    });

    consoleErrorSpy.mockRestore();
  });
});