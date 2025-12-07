/**
 * Comprehensive unit tests for frontend/src/components/ChatInterface.jsx
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChatInterface from './ChatInterface';

// Mock child components
vi.mock('./Stage1', () => ({
  default: ({ responses }) => (
    <div data-testid="stage1">{responses.length} responses</div>
  )
}));

vi.mock('./Stage2', () => ({
  default: ({ rankings, labelToModel, aggregateRankings }) => (
    <div data-testid="stage2">
      {rankings.length} rankings
      {aggregateRankings && <span data-testid="aggregate-rankings">Aggregated</span>}
    </div>
  )
}));

vi.mock('./Stage3', () => ({
  default: ({ finalResponse }) => (
    <div data-testid="stage3">{finalResponse.response}</div>
  )
}));

describe('ChatInterface Component', () => {
  const mockOnSendMessage = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Empty States', () => {
    it('should show welcome message when no conversation selected', () => {
      render(
        <ChatInterface
          conversation={null}
          onSendMessage={mockOnSendMessage}
          isLoading={false}
        />
      );

      expect(screen.getByText('Welcome to LLM Council')).toBeInTheDocument();
      expect(screen.getByText('Create a new conversation to get started')).toBeInTheDocument();
    });

    it('should show start conversation message when conversation has no messages', () => {
      const emptyConversation = {
        id: '1',
        title: 'Test',
        messages: []
      };

      render(
        <ChatInterface
          conversation={emptyConversation}
          onSendMessage={mockOnSendMessage}
          isLoading={false}
        />
      );

      expect(screen.getByText('Start a conversation')).toBeInTheDocument();
      expect(screen.getByText('Ask a question to consult the LLM Council')).toBeInTheDocument();
    });
  });

  describe('Message Display', () => {
    it('should display user messages', () => {
      const conversation = {
        id: '1',
        title: 'Test',
        messages: [
          { role: 'user', content: 'Hello, how are you?' }
        ]
      };

      render(
        <ChatInterface
          conversation={conversation}
          onSendMessage={mockOnSendMessage}
          isLoading={false}
        />
      );

      expect(screen.getByText('You')).toBeInTheDocument();
      expect(screen.getByText('Hello, how are you?')).toBeInTheDocument();
    });

    it('should display assistant messages with stages', () => {
      const conversation = {
        id: '1',
        title: 'Test',
        messages: [
          { role: 'user', content: 'Question' },
          {
            role: 'assistant',
            stage1: [{ model: 'm1', response: 'R1' }],
            stage2: [{ model: 'm1', ranking: 'Ranking' }],
            stage3: { model: 'chairman', response: 'Final answer' },
            metadata: { label_to_model: {}, aggregate_rankings: [] }
          }
        ]
      };

      render(
        <ChatInterface
          conversation={conversation}
          onSendMessage={mockOnSendMessage}
          isLoading={false}
        />
      );

      expect(screen.getByText('LLM Council')).toBeInTheDocument();
      expect(screen.getByTestId('stage1')).toBeInTheDocument();
      expect(screen.getByTestId('stage2')).toBeInTheDocument();
      expect(screen.getByTestId('stage3')).toBeInTheDocument();
    });

    it('should display multiple messages in conversation', () => {
      const conversation = {
        id: '1',
        title: 'Test',
        messages: [
          { role: 'user', content: 'First question' },
          {
            role: 'assistant',
            stage1: [],
            stage2: [],
            stage3: { model: 'chairman', response: 'First answer' }
          },
          { role: 'user', content: 'Second question' },
          {
            role: 'assistant',
            stage1: [],
            stage2: [],
            stage3: { model: 'chairman', response: 'Second answer' }
          }
        ]
      };

      render(
        <ChatInterface
          conversation={conversation}
          onSendMessage={mockOnSendMessage}
          isLoading={false}
        />
      );

      expect(screen.getByText('First question')).toBeInTheDocument();
      expect(screen.getByText('Second question')).toBeInTheDocument();
    });

    it('should display loading indicators for stages in progress', () => {
      const conversation = {
        id: '1',
        title: 'Test',
        messages: [
          { role: 'user', content: 'Question' },
          {
            role: 'assistant',
            stage1: null,
            stage2: null,
            stage3: null,
            loading: {
              stage1: true,
              stage2: false,
              stage3: false
            }
          }
        ]
      };

      render(
        <ChatInterface
          conversation={conversation}
          onSendMessage={mockOnSendMessage}
          isLoading={false}
        />
      );

      expect(screen.getByText(/Running Stage 1/)).toBeInTheDocument();
    });

    it('should show different loading messages for each stage', () => {
      const testCases = [
        { stage1: true, stage2: false, stage3: false, expected: 'Running Stage 1' },
        { stage1: false, stage2: true, stage3: false, expected: 'Running Stage 2' },
        { stage1: false, stage2: false, stage3: true, expected: 'Running Stage 3' }
      ];

      testCases.forEach(({ stage1, stage2, stage3, expected }) => {
        const conversation = {
          id: '1',
          title: 'Test',
          messages: [
            { role: 'user', content: 'Q' },
            {
              role: 'assistant',
              stage1: null,
              stage2: null,
              stage3: null,
              loading: { stage1, stage2, stage3 }
            }
          ]
        };

        const { unmount } = render(
          <ChatInterface
            conversation={conversation}
            onSendMessage={mockOnSendMessage}
            isLoading={false}
          />
        );

        expect(screen.getByText(new RegExp(expected))).toBeInTheDocument();
        unmount();
      });
    });
  });

  describe('Input Form', () => {
    it('should show input form only when conversation is empty', () => {
      const emptyConversation = {
        id: '1',
        title: 'Test',
        messages: []
      };

      render(
        <ChatInterface
          conversation={emptyConversation}
          onSendMessage={mockOnSendMessage}
          isLoading={false}
        />
      );

      expect(screen.getByPlaceholderText(/Ask your question/)).toBeInTheDocument();
      expect(screen.getByText('Send')).toBeInTheDocument();
    });

    it('should not show input form when conversation has messages', () => {
      const conversationWithMessages = {
        id: '1',
        title: 'Test',
        messages: [
          { role: 'user', content: 'Question' }
        ]
      };

      render(
        <ChatInterface
          conversation={conversationWithMessages}
          onSendMessage={mockOnSendMessage}
          isLoading={false}
        />
      );

      expect(screen.queryByPlaceholderText(/Ask your question/)).not.toBeInTheDocument();
    });

    it('should allow typing in textarea', async () => {
      const emptyConversation = {
        id: '1',
        title: 'Test',
        messages: []
      };

      render(
        <ChatInterface
          conversation={emptyConversation}
          onSendMessage={mockOnSendMessage}
          isLoading={false}
        />
      );

      const textarea = screen.getByPlaceholderText(/Ask your question/);
      await userEvent.type(textarea, 'Test message');

      expect(textarea).toHaveValue('Test message');
    });

    it('should send message when Send button clicked', async () => {
      const emptyConversation = {
        id: '1',
        title: 'Test',
        messages: []
      };

      render(
        <ChatInterface
          conversation={emptyConversation}
          onSendMessage={mockOnSendMessage}
          isLoading={false}
        />
      );

      const textarea = screen.getByPlaceholderText(/Ask your question/);
      await userEvent.type(textarea, 'Test message');
      await userEvent.click(screen.getByText('Send'));

      expect(mockOnSendMessage).toHaveBeenCalledWith('Test message');
    });

    it('should send message when Enter is pressed', async () => {
      const emptyConversation = {
        id: '1',
        title: 'Test',
        messages: []
      };

      render(
        <ChatInterface
          conversation={emptyConversation}
          onSendMessage={mockOnSendMessage}
          isLoading={false}
        />
      );

      const textarea = screen.getByPlaceholderText(/Ask your question/);
      await userEvent.type(textarea, 'Test message{Enter}');

      expect(mockOnSendMessage).toHaveBeenCalledWith('Test message');
    });

    it('should not send message when Shift+Enter is pressed', async () => {
      const emptyConversation = {
        id: '1',
        title: 'Test',
        messages: []
      };

      render(
        <ChatInterface
          conversation={emptyConversation}
          onSendMessage={mockOnSendMessage}
          isLoading={false}
        />
      );

      const textarea = screen.getByPlaceholderText(/Ask your question/);
      await userEvent.type(textarea, 'Line 1{Shift>}{Enter}{/Shift}Line 2');

      expect(mockOnSendMessage).not.toHaveBeenCalled();
      expect(textarea).toHaveValue('Line 1\nLine 2');
    });

    it('should clear input after sending message', async () => {
      const emptyConversation = {
        id: '1',
        title: 'Test',
        messages: []
      };

      render(
        <ChatInterface
          conversation={emptyConversation}
          onSendMessage={mockOnSendMessage}
          isLoading={false}
        />
      );

      const textarea = screen.getByPlaceholderText(/Ask your question/);
      await userEvent.type(textarea, 'Test message');
      await userEvent.click(screen.getByText('Send'));

      expect(textarea).toHaveValue('');
    });

    it('should not send empty message', async () => {
      const emptyConversation = {
        id: '1',
        title: 'Test',
        messages: []
      };

      render(
        <ChatInterface
          conversation={emptyConversation}
          onSendMessage={mockOnSendMessage}
          isLoading={false}
        />
      );

      await userEvent.click(screen.getByText('Send'));

      expect(mockOnSendMessage).not.toHaveBeenCalled();
    });

    it('should not send whitespace-only message', async () => {
      const emptyConversation = {
        id: '1',
        title: 'Test',
        messages: []
      };

      render(
        <ChatInterface
          conversation={emptyConversation}
          onSendMessage={mockOnSendMessage}
          isLoading={false}
        />
      );

      const textarea = screen.getByPlaceholderText(/Ask your question/);
      await userEvent.type(textarea, '   ');
      await userEvent.click(screen.getByText('Send'));

      expect(mockOnSendMessage).not.toHaveBeenCalled();
    });

    it('should disable input when loading', () => {
      const emptyConversation = {
        id: '1',
        title: 'Test',
        messages: []
      };

      render(
        <ChatInterface
          conversation={emptyConversation}
          onSendMessage={mockOnSendMessage}
          isLoading={true}
        />
      );

      const textarea = screen.getByPlaceholderText(/Ask your question/);
      const sendButton = screen.getByText('Send');

      expect(textarea).toBeDisabled();
      expect(sendButton).toBeDisabled();
    });

    it('should disable send button when input is empty', () => {
      const emptyConversation = {
        id: '1',
        title: 'Test',
        messages: []
      };

      render(
        <ChatInterface
          conversation={emptyConversation}
          onSendMessage={mockOnSendMessage}
          isLoading={false}
        />
      );

      const sendButton = screen.getByText('Send');
      expect(sendButton).toBeDisabled();
    });
  });

  describe('Loading State', () => {
    it('should display global loading indicator when loading', () => {
      const conversation = {
        id: '1',
        title: 'Test',
        messages: [{ role: 'user', content: 'Question' }]
      };

      render(
        <ChatInterface
          conversation={conversation}
          onSendMessage={mockOnSendMessage}
          isLoading={true}
        />
      );

      expect(screen.getByText('Consulting the council...')).toBeInTheDocument();
    });

    it('should not display global loading indicator when not loading', () => {
      const conversation = {
        id: '1',
        title: 'Test',
        messages: [{ role: 'user', content: 'Question' }]
      };

      render(
        <ChatInterface
          conversation={conversation}
          onSendMessage={mockOnSendMessage}
          isLoading={false}
        />
      );

      expect(screen.queryByText('Consulting the council...')).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long messages', () => {
      const longMessage = 'A'.repeat(10000);
      const conversation = {
        id: '1',
        title: 'Test',
        messages: [
          { role: 'user', content: longMessage }
        ]
      };

      render(
        <ChatInterface
          conversation={conversation}
          onSendMessage={mockOnSendMessage}
          isLoading={false}
        />
      );

      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });

    it('should handle messages with markdown', () => {
      const markdownMessage = '# Heading\n\n**Bold** and *italic*';
      const conversation = {
        id: '1',
        title: 'Test',
        messages: [
          { role: 'user', content: markdownMessage }
        ]
      };

      render(
        <ChatInterface
          conversation={conversation}
          onSendMessage={mockOnSendMessage}
          isLoading={false}
        />
      );

      // ReactMarkdown should render the markdown
      expect(screen.getByText(/Heading/)).toBeInTheDocument();
    });

    it('should handle messages with special characters', () => {
      const specialMessage = 'Test <>&"\' 你好 🌍';
      const conversation = {
        id: '1',
        title: 'Test',
        messages: [
          { role: 'user', content: specialMessage }
        ]
      };

      render(
        <ChatInterface
          conversation={conversation}
          onSendMessage={mockOnSendMessage}
          isLoading={false}
        />
      );

      expect(screen.getByText(specialMessage)).toBeInTheDocument();
    });

    it('should handle rapid input changes', async () => {
      const emptyConversation = {
        id: '1',
        title: 'Test',
        messages: []
      };

      render(
        <ChatInterface
          conversation={emptyConversation}
          onSendMessage={mockOnSendMessage}
          isLoading={false}
        />
      );

      const textarea = screen.getByPlaceholderText(/Ask your question/);
      
      // Rapidly type and delete
      await userEvent.type(textarea, 'Test');
      await userEvent.clear(textarea);
      await userEvent.type(textarea, 'Another test');

      expect(textarea).toHaveValue('Another test');
    });

    it('should handle assistant message with missing stage data', () => {
      const conversation = {
        id: '1',
        title: 'Test',
        messages: [
          { role: 'user', content: 'Question' },
          {
            role: 'assistant',
            stage1: null,
            stage2: null,
            stage3: null
          }
        ]
      };

      render(
        <ChatInterface
          conversation={conversation}
          onSendMessage={mockOnSendMessage}
          isLoading={false}
        />
      );

      // Should not crash
      expect(screen.getByText('Question')).toBeInTheDocument();
    });
  });
});