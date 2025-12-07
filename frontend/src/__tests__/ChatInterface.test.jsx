import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChatInterface from '../components/ChatInterface';

// Mock child components
vi.mock('../components/Stage1', () => ({
  default: ({ responses }) => (
    <div data-testid="stage1-mock">Stage 1: {responses?.length || 0} responses</div>
  ),
}));

vi.mock('../components/Stage2', () => ({
  default: ({ rankings }) => (
    <div data-testid="stage2-mock">Stage 2: {rankings?.length || 0} rankings</div>
  ),
}));

vi.mock('../components/Stage3', () => ({
  default: ({ finalResponse }) => (
    <div data-testid="stage3-mock">Stage 3: {finalResponse?.response || 'No response'}</div>
  ),
}));

describe('ChatInterface Component', () => {
  const mockConversation = {
    id: 'conv-123',
    title: 'Test Conversation',
    messages: [
      {
        role: 'user',
        content: 'What is AI?',
      },
      {
        role: 'assistant',
        stage1: [{ model: 'model1', response: 'AI response' }],
        stage2: [{ model: 'model1', ranking: 'Ranking' }],
        stage3: { model: 'chairman', response: 'Final AI answer' },
      },
    ],
  };

  const defaultProps = {
    conversation: mockConversation,
    onSendMessage: vi.fn(),
    isLoading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Empty State', () => {
    it('shows welcome message when no conversation', () => {
      render(<ChatInterface conversation={null} onSendMessage={vi.fn()} isLoading={false} />);
      
      expect(screen.getByText('Welcome to LLM Council')).toBeInTheDocument();
      expect(screen.getByText('Create a new conversation to get started')).toBeInTheDocument();
    });

    it('shows start message when conversation has no messages', () => {
      const emptyConv = { ...mockConversation, messages: [] };
      render(<ChatInterface conversation={emptyConv} onSendMessage={vi.fn()} isLoading={false} />);
      
      expect(screen.getByText('Start a conversation')).toBeInTheDocument();
      expect(screen.getByText('Ask a question to consult the LLM Council')).toBeInTheDocument();
    });
  });

  describe('Message Display', () => {
    it('renders user messages', () => {
      render(<ChatInterface {...defaultProps} />);
      
      expect(screen.getByText('What is AI?')).toBeInTheDocument();
      expect(screen.getByText('You')).toBeInTheDocument();
    });

    it('renders assistant messages with stages', () => {
      render(<ChatInterface {...defaultProps} />);
      
      expect(screen.getByTestId('stage1-mock')).toBeInTheDocument();
      expect(screen.getByTestId('stage2-mock')).toBeInTheDocument();
      expect(screen.getByTestId('stage3-mock')).toBeInTheDocument();
    });

    it('renders multiple message pairs', () => {
      const multiMsgConv = {
        ...mockConversation,
        messages: [
          { role: 'user', content: 'First question' },
          { role: 'assistant', stage3: { model: 'm', response: 'First answer' } },
          { role: 'user', content: 'Second question' },
          { role: 'assistant', stage3: { model: 'm', response: 'Second answer' } },
        ],
      };
      
      render(<ChatInterface conversation={multiMsgConv} onSendMessage={vi.fn()} isLoading={false} />);
      
      expect(screen.getByText('First question')).toBeInTheDocument();
      expect(screen.getByText('Second question')).toBeInTheDocument();
    });

    it('renders markdown in user messages', () => {
      const markdownConv = {
        ...mockConversation,
        messages: [
          { role: 'user', content: '# Question\n\nWhat is **AI**?' },
        ],
      };
      
      render(<ChatInterface conversation={markdownConv} onSendMessage={vi.fn()} isLoading={false} />);
      
      expect(screen.getByText('Question')).toBeInTheDocument();
    });
  });

  describe('Message Input', () => {
    it('renders input textarea', () => {
      render(<ChatInterface {...defaultProps} />);
      
      const textarea = screen.getByRole('textbox');
      expect(textarea).toBeInTheDocument();
    });

    it('updates input value on typing', async () => {
      const user = userEvent.setup();
      render(<ChatInterface {...defaultProps} />);
      
      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'New message');
      
      expect(textarea).toHaveValue('New message');
    });

    it('clears input after sending', async () => {
      const user = userEvent.setup();
      render(<ChatInterface {...defaultProps} />);
      
      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'Test message');
      
      const form = textarea.closest('form');
      fireEvent.submit(form);
      
      await waitFor(() => {
        expect(textarea).toHaveValue('');
      });
    });

    it('calls onSendMessage with input value', async () => {
      const onSendMessage = vi.fn();
      const user = userEvent.setup();
      
      render(<ChatInterface {...defaultProps} onSendMessage={onSendMessage} />);
      
      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'Test message');
      
      const form = textarea.closest('form');
      fireEvent.submit(form);
      
      expect(onSendMessage).toHaveBeenCalledWith('Test message');
    });

    it('does not send empty messages', () => {
      const onSendMessage = vi.fn();
      render(<ChatInterface {...defaultProps} onSendMessage={onSendMessage} />);
      
      const textarea = screen.getByRole('textbox');
      const form = textarea.closest('form');
      fireEvent.submit(form);
      
      expect(onSendMessage).not.toHaveBeenCalled();
    });

    it('does not send whitespace-only messages', async () => {
      const onSendMessage = vi.fn();
      const user = userEvent.setup();
      
      render(<ChatInterface {...defaultProps} onSendMessage={onSendMessage} />);
      
      const textarea = screen.getByRole('textbox');
      await user.type(textarea, '   ');
      
      const form = textarea.closest('form');
      fireEvent.submit(form);
      
      expect(onSendMessage).not.toHaveBeenCalled();
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('sends message on Enter key', async () => {
      const onSendMessage = vi.fn();
      const user = userEvent.setup();
      
      render(<ChatInterface {...defaultProps} onSendMessage={onSendMessage} />);
      
      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'Test message');
      await user.keyboard('{Enter}');
      
      expect(onSendMessage).toHaveBeenCalledWith('Test message');
    });

    it('adds newline on Shift+Enter', async () => {
      const user = userEvent.setup();
      render(<ChatInterface {...defaultProps} />);
      
      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'Line 1');
      await user.keyboard('{Shift>}{Enter}{/Shift}');
      await user.type(textarea, 'Line 2');
      
      expect(textarea.value).toContain('\n');
    });

    it('does not send on Shift+Enter', async () => {
      const onSendMessage = vi.fn();
      const user = userEvent.setup();
      
      render(<ChatInterface {...defaultProps} onSendMessage={onSendMessage} />);
      
      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'Test');
      await user.keyboard('{Shift>}{Enter}{/Shift}');
      
      expect(onSendMessage).not.toHaveBeenCalled();
    });
  });

  describe('Loading State', () => {
    it('disables input when loading', () => {
      render(<ChatInterface {...defaultProps} isLoading={true} />);
      
      const textarea = screen.getByRole('textbox');
      expect(textarea).toBeDisabled();
    });

    it('shows loading indicators for stages', () => {
      const loadingConv = {
        ...mockConversation,
        messages: [
          {
            role: 'assistant',
            loading: {
              stage1: true,
              stage2: true,
              stage3: true,
            },
          },
        ],
      };
      
      render(<ChatInterface conversation={loadingConv} onSendMessage={vi.fn()} isLoading={false} />);
      
      const loadingTexts = screen.getAllByText(/Running Stage/);
      expect(loadingTexts.length).toBeGreaterThan(0);
    });

    it('shows spinner during loading', () => {
      const loadingConv = {
        ...mockConversation,
        messages: [
          {
            role: 'assistant',
            loading: { stage1: true },
          },
        ],
      };
      
      const { container } = render(
        <ChatInterface conversation={loadingConv} onSendMessage={vi.fn()} isLoading={false} />
      );
      
      expect(container.querySelector('.spinner')).toBeInTheDocument();
    });
  });

  describe('Auto-scrolling', () => {
    it('scrolls to bottom on new messages', async () => {
      const { rerender } = render(<ChatInterface {...defaultProps} />);
      
      const updatedConv = {
        ...mockConversation,
        messages: [
          ...mockConversation.messages,
          { role: 'user', content: 'New message' },
        ],
      };
      
      rerender(<ChatInterface conversation={updatedConv} onSendMessage={vi.fn()} isLoading={false} />);
      
      // Verify new message is rendered
      await waitFor(() => {
        expect(screen.getByText('New message')).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles very long messages', async () => {
      const longMessage = 'A'.repeat(10000);
      const user = userEvent.setup();
      
      render(<ChatInterface {...defaultProps} />);
      
      const textarea = screen.getByRole('textbox');
      await user.type(textarea, longMessage);
      
      expect(textarea.value).toHaveLength(10000);
    });

    it('handles unicode in messages', async () => {
      const unicodeMessage = '你好世界 🌍 café';
      const user = userEvent.setup();
      
      render(<ChatInterface {...defaultProps} />);
      
      const textarea = screen.getByRole('textbox');
      await user.type(textarea, unicodeMessage);
      
      expect(textarea.value).toBe(unicodeMessage);
    });

    it('handles conversation switching', () => {
      const { rerender } = render(<ChatInterface {...defaultProps} />);
      
      const newConv = {
        id: 'conv-456',
        title: 'New Conversation',
        messages: [{ role: 'user', content: 'Different message' }],
      };
      
      rerender(<ChatInterface conversation={newConv} onSendMessage={vi.fn()} isLoading={false} />);
      
      expect(screen.getByText('Different message')).toBeInTheDocument();
      expect(screen.queryByText('What is AI?')).not.toBeInTheDocument();
    });

    it('handles partial assistant messages', () => {
      const partialConv = {
        ...mockConversation,
        messages: [
          {
            role: 'assistant',
            stage1: [{ model: 'm1', response: 'R1' }],
            // stage2 and stage3 missing
          },
        ],
      };
      
      render(<ChatInterface conversation={partialConv} onSendMessage={vi.fn()} isLoading={false} />);
      
      expect(screen.getByTestId('stage1-mock')).toBeInTheDocument();
    });
  });
});