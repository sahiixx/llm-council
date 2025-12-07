/**
 * Comprehensive unit tests for Sidebar.jsx
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Sidebar from '../Sidebar';

describe('Sidebar Component', () => {
  const mockOnSelectConversation = vi.fn();
  const mockOnNewConversation = vi.fn();

  const defaultProps = {
    conversations: [],
    currentConversationId: null,
    onSelectConversation: mockOnSelectConversation,
    onNewConversation: mockOnNewConversation,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render title', () => {
      render(<Sidebar {...defaultProps} />);
      expect(screen.getByText('LLM Council')).toBeInTheDocument();
    });

    it('should render new conversation button', () => {
      render(<Sidebar {...defaultProps} />);
      expect(screen.getByText(/new conversation/i)).toBeInTheDocument();
    });

    it('should show empty state when no conversations', () => {
      render(<Sidebar {...defaultProps} />);
      expect(screen.getByText(/no conversations yet/i)).toBeInTheDocument();
    });

    it('should render conversation list when conversations exist', () => {
      const conversations = [
        { id: '1', title: 'Test Conv 1', message_count: 2, created_at: '2024-01-01' },
        { id: '2', title: 'Test Conv 2', message_count: 5, created_at: '2024-01-02' },
      ];

      render(<Sidebar {...defaultProps} conversations={conversations} />);

      expect(screen.getByText('Test Conv 1')).toBeInTheDocument();
      expect(screen.getByText('Test Conv 2')).toBeInTheDocument();
      expect(screen.getByText('2 messages')).toBeInTheDocument();
      expect(screen.getByText('5 messages')).toBeInTheDocument();
    });

    it('should display default title for conversations without title', () => {
      const conversations = [
        { id: '1', title: '', message_count: 0, created_at: '2024-01-01' },
      ];

      render(<Sidebar {...defaultProps} conversations={conversations} />);
      expect(screen.getByText('New Conversation')).toBeInTheDocument();
    });
  });

  describe('Active Conversation', () => {
    it('should highlight active conversation', () => {
      const conversations = [
        { id: 'conv-1', title: 'Active', message_count: 1, created_at: '2024-01-01' },
        { id: 'conv-2', title: 'Inactive', message_count: 1, created_at: '2024-01-02' },
      ];

      const { container } = render(
        <Sidebar {...defaultProps} conversations={conversations} currentConversationId="conv-1" />
      );

      const activeItem = container.querySelector('.conversation-item.active');
      expect(activeItem).toBeInTheDocument();
      expect(activeItem).toHaveTextContent('Active');
    });

    it('should not have active class when no conversation selected', () => {
      const conversations = [
        { id: 'conv-1', title: 'Conv 1', message_count: 1, created_at: '2024-01-01' },
      ];

      const { container } = render(
        <Sidebar {...defaultProps} conversations={conversations} />
      );

      const activeItems = container.querySelectorAll('.conversation-item.active');
      expect(activeItems).toHaveLength(0);
    });
  });

  describe('User Interactions', () => {
    it('should call onNewConversation when button clicked', async () => {
      const user = userEvent.setup();
      render(<Sidebar {...defaultProps} />);

      const button = screen.getByText(/new conversation/i);
      await user.click(button);

      expect(mockOnNewConversation).toHaveBeenCalledTimes(1);
    });

    it('should call onSelectConversation when conversation clicked', async () => {
      const user = userEvent.setup();
      const conversations = [
        { id: 'conv-123', title: 'Test', message_count: 1, created_at: '2024-01-01' },
      ];

      render(<Sidebar {...defaultProps} conversations={conversations} />);

      const convItem = screen.getByText('Test');
      await user.click(convItem);

      expect(mockOnSelectConversation).toHaveBeenCalledWith('conv-123');
    });

    it('should call onSelectConversation with correct ID for multiple conversations', async () => {
      const user = userEvent.setup();
      const conversations = [
        { id: 'conv-1', title: 'First', message_count: 1, created_at: '2024-01-01' },
        { id: 'conv-2', title: 'Second', message_count: 1, created_at: '2024-01-02' },
      ];

      render(<Sidebar {...defaultProps} conversations={conversations} />);

      await user.click(screen.getByText('Second'));
      expect(mockOnSelectConversation).toHaveBeenCalledWith('conv-2');

      await user.click(screen.getByText('First'));
      expect(mockOnSelectConversation).toHaveBeenCalledWith('conv-1');
    });
  });

  describe('Message Count Display', () => {
    it('should show correct message count', () => {
      const conversations = [
        { id: '1', title: 'Zero Messages', message_count: 0, created_at: '2024-01-01' },
        { id: '2', title: 'One Message', message_count: 1, created_at: '2024-01-02' },
        { id: '3', title: 'Many Messages', message_count: 42, created_at: '2024-01-03' },
      ];

      render(<Sidebar {...defaultProps} conversations={conversations} />);

      expect(screen.getByText('0 messages')).toBeInTheDocument();
      expect(screen.getByText('1 messages')).toBeInTheDocument();
      expect(screen.getByText('42 messages')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null currentConversationId', () => {
      const conversations = [
        { id: '1', title: 'Test', message_count: 1, created_at: '2024-01-01' },
      ];

      expect(() => {
        render(<Sidebar {...defaultProps} conversations={conversations} currentConversationId={null} />);
      }).not.toThrow();
    });

    it('should handle undefined title in conversation', () => {
      const conversations = [
        { id: '1', message_count: 1, created_at: '2024-01-01' },
      ];

      render(<Sidebar {...defaultProps} conversations={conversations} />);
      expect(screen.getByText('New Conversation')).toBeInTheDocument();
    });

    it('should render large number of conversations', () => {
      const conversations = Array.from({ length: 100 }, (_, i) => ({
        id: `conv-${i}`,
        title: `Conversation ${i}`,
        message_count: i,
        created_at: '2024-01-01',
      }));

      render(<Sidebar {...defaultProps} conversations={conversations} />);

      expect(screen.getByText('Conversation 0')).toBeInTheDocument();
      expect(screen.getByText('Conversation 99')).toBeInTheDocument();
    });

    it('should handle special characters in conversation titles', () => {
      const conversations = [
        { id: '1', title: 'Test <script>alert("xss")</script>', message_count: 1, created_at: '2024-01-01' },
        { id: '2', title: 'Test & Test', message_count: 1, created_at: '2024-01-02' },
        { id: '3', title: 'Test "quotes"', message_count: 1, created_at: '2024-01-03' },
      ];

      expect(() => {
        render(<Sidebar {...defaultProps} conversations={conversations} />);
      }).not.toThrow();
    });
  });
});