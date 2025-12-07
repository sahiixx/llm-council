/**
 * Comprehensive unit tests for ChatInterface.jsx
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChatInterface from '../ChatInterface';

// Mock child components
vi.mock('../Stage1', () => ({
  default: ({ responses }) => <div data-testid="stage1">Stage1: {responses.length} responses</div>
}));

vi.mock('../Stage2', () => ({
  default: ({ rankings }) => <div data-testid="stage2">Stage2: {rankings.length} rankings</div>
}));

vi.mock('../Stage3', () => ({
  default: ({ finalResponse }) => <div data-testid="stage3">Stage3: {finalResponse.model}</div>
}));

describe('ChatInterface Component', () => {
  const mockOnSendMessage = vi.fn();

  const defaultProps = {
    conversation: null,
    onSendMessage: mockOnSendMessage,
    isLoading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Empty States', () => {
    it('should show welcome message when no conversation', () => {
      render(<ChatInterface {...defaultProps} />);
      expect(screen.getByText('Welcome to LLM Council')).toBeInTheDocument();
      expect(screen.getByText('Create a new conversation to get started')).toBeInTheDocument();
    });

    it('should show start conversation message when conversation has no messages', () => {
      const conversation = {
        id: 'conv-1',
        title: 'Test',
        messages: [],
      };

      render(<ChatInterface {...defaultProps} conversation={conversation} />);
      expect(screen.getByText('Start a conversation')).toBeInTheDocument();
      expect(screen.getByText('Ask a question to consult the LLM Council')).toBeInTheDocument();
    });
  });

  describe('Input Form', () => {
    it('should render input form for empty conversation', () => {
      const conversation = { id: 'conv-1', messages: [] };
      render(<ChatInterface {...defaultProps} conversation={conversation} />);

      const input = screen.getByPlaceholderText(/ask your question/i);
      expect(input).toBeInTheDocument();
      expect(screen.getByText('Send')).toBeInTheDocument();
    });

    it('should update input value when typing', async () => {
      const user = userEvent.setup();
      const conversation = { id: 'conv-1', messages: [] };
      render(<ChatInterface {...defaultProps} conversation={conversation} />);

      const input = screen.getByPlaceholderText(/ask your question/i);
      await user.type(input, 'Test message');

      expect(input).toHaveValue('Test message');
    });

    it('should send message on Enter key', async () => {
      const user = userEvent.setup();
      const conversation = { id: 'conv-1', messages: [] };
      render(<ChatInterface {...defaultProps} conversation={conversation} />);

      const input = screen.getByPlaceholderText(/ask your question/i);
      await user.type(input, 'Test message{Enter}');

      expect(mockOnSendMessage).toHaveBeenCalledWith('Test message');
    });

    it('should not send message on Shift+Enter', async () => {
      const user = userEvent.setup();
      const conversation = { id: 'conv-1', messages: [] };
      render(<ChatInterface {...defaultProps} conversation={conversation} />);

      const input = screen.getByPlaceholderText(/ask your question/i);
      await user.type(input, 'Line 1{Shift>}{Enter}{/Shift}Line 2');

      expect(mockOnSendMessage).not.toHaveBeenCalled();
    });

    it('should send message on button click', async () => {
      const user = userEvent.setup();
      const conversation = { id: 'conv-1', messages: [] };
      render(<ChatInterface {...defaultProps} conversation={conversation} />);

      const input = screen.getByPlaceholderText(/ask your question/i);
      await user.type(input, 'Test message');

      const button = screen.getByText('Send');
      await user.click(button);

      expect(mockOnSendMessage).toHaveBeenCalledWith('Test message');
    });

    it('should clear input after sending', async () => {
      const user = userEvent.setup();
      const conversation = { id: 'conv-1', messages: [] };
      render(<ChatInterface {...defaultProps} conversation={conversation} />);

      const input = screen.getByPlaceholderText(/ask your question/i);
      await user.type(input, 'Test{Enter}');

      await waitFor(() => {
        expect(input).toHaveValue('');
      });
    });

    it('should not send empty messages', async () => {
      const user = userEvent.setup();
      const conversation = { id: 'conv-1', messages: [] };
      render(<ChatInterface {...defaultProps} conversation={conversation} />);

      const button = screen.getByText('Send');
      await user.click(button);

      expect(mockOnSendMessage).not.toHaveBeenCalled();
    });

    it('should not send whitespace-only messages', async () => {
      const user = userEvent.setup();
      const conversation = { id: 'conv-1', messages: [] };
      render(<ChatInterface {...defaultProps} conversation={conversation} />);

      const input = screen.getByPlaceholderText(/ask your question/i);
      await user.type(input, '   {Enter}');

      expect(mockOnSendMessage).not.toHaveBeenCalled();
    });

    it('should disable input when loading', () => {
      const conversation = { id: 'conv-1', messages: [] };
      render(<ChatInterface {...defaultProps} conversation={conversation} isLoading={true} />);

      const input = screen.getByPlaceholderText(/ask your question/i);
      expect(input).toBeDisabled();
    });

    it('should disable button when loading', () => {
      const conversation = { id: 'conv-1', messages: [] };
      render(<ChatInterface {...defaultProps} conversation={conversation} isLoading={true} />);

      const button = screen.getByText('Send');
      expect(button).toBeDisabled();
    });
  });

  describe('Message Rendering', () => {
    it('should render user messages', () => {
      const conversation = {
        id: 'conv-1',
        messages: [
          { role: 'user', content: 'Hello, LLM Council!' },
        ],
      };

      render(<ChatInterface {...defaultProps} conversation={conversation} />);
      expect(screen.getByText('You')).toBeInTheDocument();
      expect(screen.getByText('Hello, LLM Council!')).toBeInTheDocument();
    });

    it('should render assistant messages with stages', () => {
      const conversation = {
        id: 'conv-1',
        messages: [
          { role: 'user', content: 'Question' },
          {
            role: 'assistant',
            stage1: [{ model: 'm1', response: 'R1' }],
            stage2: [{ model: 'm1', ranking: 'Rank' }],
            stage3: { model: 'chairman', response: 'Final' },
          },
        ],
      };

      render(<ChatInterface {...defaultProps} conversation={conversation} />);
      expect(screen.getByText('LLM Council')).toBeInTheDocument();
      expect(screen.getByTestId('stage1')).toBeInTheDocument();
      expect(screen.getByTestId('stage2')).toBeInTheDocument();
      expect(screen.getByTestId('stage3')).toBeInTheDocument();
    });

    it('should show loading indicators for stages', () => {
      const conversation = {
        id: 'conv-1',
        messages: [
          {
            role: 'assistant',
            loading: { stage1: true, stage2: false, stage3: false },
          },
        ],
      };

      render(<ChatInterface {...defaultProps} conversation={conversation} />);
      expect(screen.getByText(/running stage 1/i)).toBeInTheDocument();
    });

    it('should render multiple messages', () => {
      const conversation = {
        id: 'conv-1',
        messages: [
          { role: 'user', content: 'First question' },
          { role: 'assistant', stage3: { model: 'm', response: 'First answer' } },
          { role: 'user', content: 'Second question' },
          { role: 'assistant', stage3: { model: 'm', response: 'Second answer' } },
        ],
      };

      render(<ChatInterface {...defaultProps} conversation={conversation} />);
      expect(screen.getByText('First question')).toBeInTheDocument();
      expect(screen.getByText('Second question')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show loading indicator when isLoading is true', () => {
      const conversation = { id: 'conv-1', messages: [] };
      render(<ChatInterface {...defaultProps} conversation={conversation} isLoading={true} />);

      expect(screen.getByText(/consulting the council/i)).toBeInTheDocument();
    });

    it('should not show loading indicator when isLoading is false', () => {
      const conversation = { id: 'conv-1', messages: [] };
      render(<ChatInterface {...defaultProps} conversation={conversation} isLoading={false} />);

      expect(screen.queryByText(/consulting the council/i)).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle messages with markdown content', () => {
      const conversation = {
        id: 'conv-1',
        messages: [
          { role: 'user', content: '**Bold** and *italic*' },
        ],
      };

      expect(() => {
        render(<ChatInterface {...defaultProps} conversation={conversation} />);
      }).not.toThrow();
    });

    it('should handle very long messages', () => {
      const longMessage = 'A'.repeat(10000);
      const conversation = {
        id: 'conv-1',
        messages: [
          { role: 'user', content: longMessage },
        ],
      };

      expect(() => {
        render(<ChatInterface {...defaultProps} conversation={conversation} />);
      }).not.toThrow();
    });

    it('should handle special characters in messages', () => {
      const conversation = {
        id: 'conv-1',
        messages: [
          { role: 'user', content: '<script>alert("test")</script>' },
          { role: 'user', content: '& < > " \'' },
        ],
      };

      expect(() => {
        render(<ChatInterface {...defaultProps} conversation={conversation} />);
      }).not.toThrow();
    });
  });
});