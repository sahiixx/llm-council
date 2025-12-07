/**
 * Comprehensive unit tests for ChatInterface.jsx
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChatInterface from '../components/ChatInterface';

// Mock child components
vi.mock('../components/Stage1', () => ({
  default: ({ responses }) => <div data-testid="stage1">Stage1: {responses.length} responses</div>,
}));

vi.mock('../components/Stage2', () => ({
  default: ({ rankings }) => <div data-testid="stage2">Stage2: {rankings.length} rankings</div>,
}));

vi.mock('../components/Stage3', () => ({
  default: ({ finalResponse }) => (
    <div data-testid="stage3">Stage3: {finalResponse.response}</div>
  ),
}));

// Mock ReactMarkdown
vi.mock('react-markdown', () => ({
  default: ({ children }) => <div>{children}</div>,
}));

describe('ChatInterface Component', () => {
  const defaultProps = {
    conversation: null,
    onSendMessage: vi.fn(),
    isLoading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Empty State', () => {
    it('displays welcome message when no conversation is selected', () => {
      render(<ChatInterface {...defaultProps} />);
      
      expect(screen.getByText('Welcome to LLM Council')).toBeInTheDocument();
      expect(screen.getByText('Create a new conversation to get started')).toBeInTheDocument();
    });

    it('displays start conversation message when conversation is empty', () => {
      const emptyConversation = {
        id: 'test',
        title: 'Test',
        messages: [],
      };
      
      render(<ChatInterface {...defaultProps} conversation={emptyConversation} />);
      
      expect(screen.getByText('Start a conversation')).toBeInTheDocument();
    });
  });

  describe('Message Input', () => {
    it('renders input form when conversation has no messages', () => {
      const conversation = {
        id: 'test',
        title: 'Test',
        messages: [],
      };
      
      render(<ChatInterface {...defaultProps} conversation={conversation} />);
      
      expect(screen.getByPlaceholderText(/Ask your question/)).toBeInTheDocument();
    });

    it('calls onSendMessage when form is submitted', async () => {
      const user = userEvent.setup();
      const mockOnSend = vi.fn();
      const conversation = {
        id: 'test',
        title: 'Test',
        messages: [],
      };
      
      render(<ChatInterface {...defaultProps} conversation={conversation} onSendMessage={mockOnSend} />);
      
      const input = screen.getByPlaceholderText(/Ask your question/);
      await user.type(input, 'Test question');
      await user.click(screen.getByText('Send'));
      
      expect(mockOnSend).toHaveBeenCalledWith('Test question');
    });

    it('clears input after sending message', async () => {
      const user = userEvent.setup();
      const conversation = {
        id: 'test',
        title: 'Test',
        messages: [],
      };
      
      render(<ChatInterface {...defaultProps} conversation={conversation} />);
      
      const input = screen.getByPlaceholderText(/Ask your question/);
      await user.type(input, 'Test question');
      await user.click(screen.getByText('Send'));
      
      expect(input).toHaveValue('');
    });

    it('does not send empty message', async () => {
      const user = userEvent.setup();
      const mockOnSend = vi.fn();
      const conversation = {
        id: 'test',
        title: 'Test',
        messages: [],
      };
      
      render(<ChatInterface {...defaultProps} conversation={conversation} onSendMessage={mockOnSend} />);
      
      await user.click(screen.getByText('Send'));
      
      expect(mockOnSend).not.toHaveBeenCalled();
    });

    it('submits on Enter key press', async () => {
      const user = userEvent.setup();
      const mockOnSend = vi.fn();
      const conversation = {
        id: 'test',
        title: 'Test',
        messages: [],
      };
      
      render(<ChatInterface {...defaultProps} conversation={conversation} onSendMessage={mockOnSend} />);
      
      const input = screen.getByPlaceholderText(/Ask your question/);
      await user.type(input, 'Test question{Enter}');
      
      expect(mockOnSend).toHaveBeenCalledWith('Test question');
    });

    it('allows new line on Shift+Enter', async () => {
      const user = userEvent.setup();
      const mockOnSend = vi.fn();
      const conversation = {
        id: 'test',
        title: 'Test',
        messages: [],
      };
      
      render(<ChatInterface {...defaultProps} conversation={conversation} onSendMessage={mockOnSend} />);
      
      const input = screen.getByPlaceholderText(/Ask your question/);
      await user.type(input, 'Line 1{Shift>}{Enter}{/Shift}Line 2');
      
      // Should not have submitted yet
      expect(mockOnSend).not.toHaveBeenCalled();
    });

    it('disables input when loading', () => {
      const conversation = {
        id: 'test',
        title: 'Test',
        messages: [],
      };
      
      render(<ChatInterface {...defaultProps} conversation={conversation} isLoading={true} />);
      
      const input = screen.getByPlaceholderText(/Ask your question/);
      expect(input).toBeDisabled();
    });

    it('disables send button when loading', () => {
      const conversation = {
        id: 'test',
        title: 'Test',
        messages: [],
      };
      
      render(<ChatInterface {...defaultProps} conversation={conversation} isLoading={true} />);
      
      const button = screen.getByText('Send');
      expect(button).toBeDisabled();
    });
  });

  describe('Message Display', () => {
    it('displays user messages', () => {
      const conversation = {
        id: 'test',
        title: 'Test',
        messages: [
          { role: 'user', content: 'Hello, council!' },
        ],
      };
      
      render(<ChatInterface {...defaultProps} conversation={conversation} />);
      
      expect(screen.getByText('You')).toBeInTheDocument();
      expect(screen.getByText('Hello, council!')).toBeInTheDocument();
    });

    it('displays assistant messages with stages', () => {
      const conversation = {
        id: 'test',
        title: 'Test',
        messages: [
          {
            role: 'assistant',
            stage1: [{ model: 'm1', response: 'R1' }],
            stage2: [{ model: 'm1', ranking: 'Rank' }],
            stage3: { model: 'chairman', response: 'Final answer' },
          },
        ],
      };
      
      render(<ChatInterface {...defaultProps} conversation={conversation} />);
      
      expect(screen.getByText('LLM Council')).toBeInTheDocument();
      expect(screen.getByTestId('stage1')).toBeInTheDocument();
      expect(screen.getByTestId('stage2')).toBeInTheDocument();
      expect(screen.getByTestId('stage3')).toBeInTheDocument();
    });

    it('displays loading indicators for stages', () => {
      const conversation = {
        id: 'test',
        title: 'Test',
        messages: [
          {
            role: 'assistant',
            stage1: null,
            stage2: null,
            stage3: null,
            loading: {
              stage1: true,
              stage2: false,
              stage3: false,
            },
          },
        ],
      };
      
      render(<ChatInterface {...defaultProps} conversation={conversation} />);
      
      expect(screen.getByText(/Running Stage 1/)).toBeInTheDocument();
    });

    it('displays multiple messages in sequence', () => {
      const conversation = {
        id: 'test',
        title: 'Test',
        messages: [
          { role: 'user', content: 'Question 1' },
          {
            role: 'assistant',
            stage1: [{ model: 'm1', response: 'R1' }],
            stage2: [{ model: 'm1', ranking: 'Rank' }],
            stage3: { model: 'chairman', response: 'Answer 1' },
          },
          { role: 'user', content: 'Question 2' },
        ],
      };
      
      render(<ChatInterface {...defaultProps} conversation={conversation} />);
      
      expect(screen.getByText('Question 1')).toBeInTheDocument();
      expect(screen.getByText('Question 2')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('displays loading indicator when isLoading is true', () => {
      const conversation = {
        id: 'test',
        title: 'Test',
        messages: [],
      };
      
      render(<ChatInterface {...defaultProps} conversation={conversation} isLoading={true} />);
      
      expect(screen.getByText('Consulting the council...')).toBeInTheDocument();
    });

    it('does not display loading indicator when isLoading is false', () => {
      const conversation = {
        id: 'test',
        title: 'Test',
        messages: [],
      };
      
      render(<ChatInterface {...defaultProps} conversation={conversation} isLoading={false} />);
      
      expect(screen.queryByText('Consulting the council...')).not.toBeInTheDocument();
    });
  });

  describe('Stage Loading States', () => {
    it('shows stage 1 loading message', () => {
      const conversation = {
        id: 'test',
        title: 'Test',
        messages: [
          {
            role: 'assistant',
            loading: { stage1: true, stage2: false, stage3: false },
          },
        ],
      };
      
      render(<ChatInterface {...defaultProps} conversation={conversation} />);
      
      expect(screen.getByText(/Running Stage 1: Collecting individual responses/)).toBeInTheDocument();
    });

    it('shows stage 2 loading message', () => {
      const conversation = {
        id: 'test',
        title: 'Test',
        messages: [
          {
            role: 'assistant',
            stage1: [{ model: 'm1', response: 'R' }],
            loading: { stage1: false, stage2: true, stage3: false },
          },
        ],
      };
      
      render(<ChatInterface {...defaultProps} conversation={conversation} />);
      
      expect(screen.getByText(/Running Stage 2: Peer rankings/)).toBeInTheDocument();
    });

    it('shows stage 3 loading message', () => {
      const conversation = {
        id: 'test',
        title: 'Test',
        messages: [
          {
            role: 'assistant',
            stage1: [{ model: 'm1', response: 'R' }],
            stage2: [{ model: 'm1', ranking: 'Rank' }],
            loading: { stage1: false, stage2: false, stage3: true },
          },
        ],
      };
      
      render(<ChatInterface {...defaultProps} conversation={conversation} />);
      
      expect(screen.getByText(/Running Stage 3: Final synthesis/)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles conversation with null title', () => {
      const conversation = {
        id: 'test',
        title: null,
        messages: [],
      };
      
      render(<ChatInterface {...defaultProps} conversation={conversation} />);
      
      expect(screen.getByPlaceholderText(/Ask your question/)).toBeInTheDocument();
    });

    it('handles very long user messages', () => {
      const longMessage = 'A'.repeat(10000);
      const conversation = {
        id: 'test',
        title: 'Test',
        messages: [
          { role: 'user', content: longMessage },
        ],
      };
      
      render(<ChatInterface {...defaultProps} conversation={conversation} />);
      
      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });

    it('handles messages with special characters', () => {
      const conversation = {
        id: 'test',
        title: 'Test',
        messages: [
          { role: 'user', content: 'Test & <script> "quotes"' },
        ],
      };
      
      render(<ChatInterface {...defaultProps} conversation={conversation} />);
      
      expect(screen.getByText('Test & <script> "quotes"')).toBeInTheDocument();
    });
  });
});