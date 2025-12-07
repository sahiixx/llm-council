/**
 * Comprehensive unit tests for ChatInterface component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ChatInterface from './ChatInterface';

describe('ChatInterface Component', () => {
  const mockOnSendMessage = vi.fn();

  const defaultProps = {
    conversation: null,
    onSendMessage: mockOnSendMessage,
    isLoading: false,
  };

  beforeEach(() => {
    mockOnSendMessage.mockClear();
  });

  describe('Empty State', () => {
    it('should show welcome message when no conversation', () => {
      render(<ChatInterface {...defaultProps} />);
      expect(screen.getByText('Welcome to LLM Council')).toBeInTheDocument();
    });

    it('should show start message when conversation exists but no messages', () => {
      const emptyConversation = {
        id: 'conv-1',
        title: 'Test',
        messages: [],
      };
      
      render(<ChatInterface {...defaultProps} conversation={emptyConversation} />);
      expect(screen.getByText('Start a conversation')).toBeInTheDocument();
    });

    it('should show input form when conversation has no messages', () => {
      const emptyConversation = {
        id: 'conv-1',
        title: 'Test',
        messages: [],
      };
      
      render(<ChatInterface {...defaultProps} conversation={emptyConversation} />);
      expect(screen.getByPlaceholderText(/Ask your question/)).toBeInTheDocument();
    });
  });

  describe('Message Rendering', () => {
    it('should render user messages', () => {
      const conversation = {
        id: 'conv-1',
        title: 'Test',
        messages: [
          { role: 'user', content: 'Hello, council!' },
        ],
      };
      
      render(<ChatInterface {...defaultProps} conversation={conversation} />);
      expect(screen.getByText('Hello, council!')).toBeInTheDocument();
      expect(screen.getByText('You')).toBeInTheDocument();
    });

    it('should render assistant messages with stages', () => {
      const conversation = {
        id: 'conv-1',
        title: 'Test',
        messages: [
          { role: 'user', content: 'Question' },
          { 
            role: 'assistant',
            stage1: [{ model: 'model1', response: 'Response 1' }],
            stage2: [{ model: 'model1', ranking: 'Ranking' }],
            stage3: { model: 'chairman', response: 'Final answer' },
            metadata: {},
          },
        ],
      };
      
      render(<ChatInterface {...defaultProps} conversation={conversation} />);
      expect(screen.getByText('LLM Council')).toBeInTheDocument();
      expect(screen.getByText('Stage 1: Individual Responses')).toBeInTheDocument();
    });

    it('should show loading indicators for each stage', () => {
      const conversation = {
        id: 'conv-1',
        title: 'Test',
        messages: [
          { 
            role: 'assistant',
            loading: {
              stage1: true,
              stage2: false,
              stage3: false,
            },
          },
        ],
      };
      
      render(<ChatInterface {...defaultProps} conversation={conversation} />);
      expect(screen.getByText(/Collecting individual responses/)).toBeInTheDocument();
    });
  });

  describe('Input Handling', () => {
    it('should update input value when typing', () => {
      const conversation = {
        id: 'conv-1',
        title: 'Test',
        messages: [],
      };
      
      render(<ChatInterface {...defaultProps} conversation={conversation} />);
      
      const textarea = screen.getByPlaceholderText(/Ask your question/);
      fireEvent.change(textarea, { target: { value: 'New message' } });
      
      expect(textarea.value).toBe('New message');
    });

    it('should call onSendMessage when form submitted', () => {
      const conversation = {
        id: 'conv-1',
        title: 'Test',
        messages: [],
      };
      
      render(<ChatInterface {...defaultProps} conversation={conversation} />);
      
      const textarea = screen.getByPlaceholderText(/Ask your question/);
      fireEvent.change(textarea, { target: { value: 'Test message' } });
      
      const sendButton = screen.getByText('Send');
      fireEvent.click(sendButton);
      
      expect(mockOnSendMessage).toHaveBeenCalledWith('Test message');
    });

    it('should clear input after sending', () => {
      const conversation = {
        id: 'conv-1',
        title: 'Test',
        messages: [],
      };
      
      render(<ChatInterface {...defaultProps} conversation={conversation} />);
      
      const textarea = screen.getByPlaceholderText(/Ask your question/);
      fireEvent.change(textarea, { target: { value: 'Test' } });
      fireEvent.click(screen.getByText('Send'));
      
      expect(textarea.value).toBe('');
    });

    it('should submit on Enter key', () => {
      const conversation = {
        id: 'conv-1',
        title: 'Test',
        messages: [],
      };
      
      render(<ChatInterface {...defaultProps} conversation={conversation} />);
      
      const textarea = screen.getByPlaceholderText(/Ask your question/);
      fireEvent.change(textarea, { target: { value: 'Test' } });
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });
      
      expect(mockOnSendMessage).toHaveBeenCalledWith('Test');
    });

    it('should not submit on Shift+Enter', () => {
      const conversation = {
        id: 'conv-1',
        title: 'Test',
        messages: [],
      };
      
      render(<ChatInterface {...defaultProps} conversation={conversation} />);
      
      const textarea = screen.getByPlaceholderText(/Ask your question/);
      fireEvent.change(textarea, { target: { value: 'Test' } });
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });
      
      expect(mockOnSendMessage).not.toHaveBeenCalled();
    });

    it('should disable send button when loading', () => {
      const conversation = {
        id: 'conv-1',
        title: 'Test',
        messages: [],
      };
      
      render(<ChatInterface {...defaultProps} conversation={conversation} isLoading={true} />);
      
      const sendButton = screen.getByText('Send');
      expect(sendButton).toBeDisabled();
    });

    it('should disable send button when input empty', () => {
      const conversation = {
        id: 'conv-1',
        title: 'Test',
        messages: [],
      };
      
      render(<ChatInterface {...defaultProps} conversation={conversation} />);
      
      const sendButton = screen.getByText('Send');
      expect(sendButton).toBeDisabled();
    });

    it('should not send empty messages', () => {
      const conversation = {
        id: 'conv-1',
        title: 'Test',
        messages: [],
      };
      
      render(<ChatInterface {...defaultProps} conversation={conversation} />);
      
      const textarea = screen.getByPlaceholderText(/Ask your question/);
      fireEvent.change(textarea, { target: { value: '   ' } });
      fireEvent.click(screen.getByText('Send'));
      
      expect(mockOnSendMessage).not.toHaveBeenCalled();
    });
  });

  describe('Loading States', () => {
    it('should show loading indicator when isLoading true', () => {
      const conversation = {
        id: 'conv-1',
        title: 'Test',
        messages: [],
      };
      
      render(<ChatInterface {...defaultProps} conversation={conversation} isLoading={true} />);
      expect(screen.getByText(/Consulting the council/)).toBeInTheDocument();
    });

    it('should disable textarea when loading', () => {
      const conversation = {
        id: 'conv-1',
        title: 'Test',
        messages: [],
      };
      
      render(<ChatInterface {...defaultProps} conversation={conversation} isLoading={true} />);
      
      const textarea = screen.getByPlaceholderText(/Ask your question/);
      expect(textarea).toBeDisabled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long user input', () => {
      const conversation = {
        id: 'conv-1',
        title: 'Test',
        messages: [],
      };
      
      render(<ChatInterface {...defaultProps} conversation={conversation} />);
      
      const longText = 'A'.repeat(10000);
      const textarea = screen.getByPlaceholderText(/Ask your question/);
      fireEvent.change(textarea, { target: { value: longText } });
      
      expect(textarea.value).toBe(longText);
    });

    it('should handle many messages', () => {
      const messages = Array(50).fill(null).map((_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`,
        ...(i % 2 === 1 ? { stage1: [], stage2: [], stage3: {} } : {}),
      }));

      const conversation = {
        id: 'conv-1',
        title: 'Test',
        messages,
      };
      
      render(<ChatInterface {...defaultProps} conversation={conversation} />);
      expect(screen.getByText('Message 0')).toBeInTheDocument();
    });
  });
});