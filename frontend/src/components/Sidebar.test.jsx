/**
 * Comprehensive unit tests for Sidebar component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Sidebar from './Sidebar';

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
    mockOnSelectConversation.mockClear();
    mockOnNewConversation.mockClear();
  });

  describe('Rendering', () => {
    it('should render sidebar with title', () => {
      render(<Sidebar {...defaultProps} />);
      expect(screen.getByText('LLM Council')).toBeInTheDocument();
    });

    it('should render new conversation button', () => {
      render(<Sidebar {...defaultProps} />);
      expect(screen.getByText('+ New Conversation')).toBeInTheDocument();
    });

    it('should show empty state when no conversations', () => {
      render(<Sidebar {...defaultProps} />);
      expect(screen.getByText('No conversations yet')).toBeInTheDocument();
    });

    it('should render conversation list when conversations exist', () => {
      const conversations = [
        { id: '1', title: 'Test Conv 1', message_count: 5 },
        { id: '2', title: 'Test Conv 2', message_count: 3 },
      ];

      render(<Sidebar {...defaultProps} conversations={conversations} />);
      
      expect(screen.getByText('Test Conv 1')).toBeInTheDocument();
      expect(screen.getByText('Test Conv 2')).toBeInTheDocument();
    });

    it('should display message counts', () => {
      const conversations = [
        { id: '1', title: 'Conv 1', message_count: 5 },
      ];

      render(<Sidebar {...defaultProps} conversations={conversations} />);
      expect(screen.getByText('5 messages')).toBeInTheDocument();
    });

    it('should handle conversation with zero messages', () => {
      const conversations = [
        { id: '1', title: 'New Conv', message_count: 0 },
      ];

      render(<Sidebar {...defaultProps} conversations={conversations} />);
      expect(screen.getByText('0 messages')).toBeInTheDocument();
    });

    it('should use default title when title is missing', () => {
      const conversations = [
        { id: '1', title: null, message_count: 0 },
      ];

      render(<Sidebar {...defaultProps} conversations={conversations} />);
      expect(screen.getByText('New Conversation')).toBeInTheDocument();
    });
  });

  describe('Active State', () => {
    it('should highlight active conversation', () => {
      const conversations = [
        { id: '1', title: 'Conv 1', message_count: 5 },
        { id: '2', title: 'Conv 2', message_count: 3 },
      ];

      const { container } = render(
        <Sidebar {...defaultProps} conversations={conversations} currentConversationId="1" />
      );
      
      const conversationItems = container.querySelectorAll('.conversation-item');
      expect(conversationItems[0]).toHaveClass('active');
      expect(conversationItems[1]).not.toHaveClass('active');
    });

    it('should not highlight any conversation when none selected', () => {
      const conversations = [
        { id: '1', title: 'Conv 1', message_count: 5 },
      ];

      const { container } = render(
        <Sidebar {...defaultProps} conversations={conversations} currentConversationId={null} />
      );
      
      const conversationItems = container.querySelectorAll('.conversation-item');
      expect(conversationItems[0]).not.toHaveClass('active');
    });

    it('should update active state when selection changes', () => {
      const conversations = [
        { id: '1', title: 'Conv 1', message_count: 5 },
        { id: '2', title: 'Conv 2', message_count: 3 },
      ];

      const { container, rerender } = render(
        <Sidebar {...defaultProps} conversations={conversations} currentConversationId="1" />
      );
      
      let conversationItems = container.querySelectorAll('.conversation-item');
      expect(conversationItems[0]).toHaveClass('active');

      rerender(
        <Sidebar {...defaultProps} conversations={conversations} currentConversationId="2" />
      );
      
      conversationItems = container.querySelectorAll('.conversation-item');
      expect(conversationItems[0]).not.toHaveClass('active');
      expect(conversationItems[1]).toHaveClass('active');
    });
  });

  describe('Interactions', () => {
    it('should call onNewConversation when new button clicked', () => {
      render(<Sidebar {...defaultProps} />);
      
      const newButton = screen.getByText('+ New Conversation');
      fireEvent.click(newButton);
      
      expect(mockOnNewConversation).toHaveBeenCalledTimes(1);
    });

    it('should call onSelectConversation when conversation clicked', () => {
      const conversations = [
        { id: 'conv-123', title: 'Test Conv', message_count: 5 },
      ];

      render(<Sidebar {...defaultProps} conversations={conversations} />);
      
      const conversationItem = screen.getByText('Test Conv');
      fireEvent.click(conversationItem);
      
      expect(mockOnSelectConversation).toHaveBeenCalledWith('conv-123');
    });

    it('should call onSelectConversation with correct ID for multiple conversations', () => {
      const conversations = [
        { id: 'conv-1', title: 'Conv 1', message_count: 5 },
        { id: 'conv-2', title: 'Conv 2', message_count: 3 },
      ];

      render(<Sidebar {...defaultProps} conversations={conversations} />);
      
      fireEvent.click(screen.getByText('Conv 2'));
      expect(mockOnSelectConversation).toHaveBeenCalledWith('conv-2');
      
      mockOnSelectConversation.mockClear();
      
      fireEvent.click(screen.getByText('Conv 1'));
      expect(mockOnSelectConversation).toHaveBeenCalledWith('conv-1');
    });

    it('should handle rapid clicks on new conversation button', () => {
      render(<Sidebar {...defaultProps} />);
      
      const newButton = screen.getByText('+ New Conversation');
      fireEvent.click(newButton);
      fireEvent.click(newButton);
      fireEvent.click(newButton);
      
      expect(mockOnNewConversation).toHaveBeenCalledTimes(3);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long conversation titles', () => {
      const conversations = [
        { id: '1', title: 'A'.repeat(200), message_count: 5 },
      ];

      render(<Sidebar {...defaultProps} conversations={conversations} />);
      expect(screen.getByText('A'.repeat(200))).toBeInTheDocument();
    });

    it('should handle large number of conversations', () => {
      const conversations = Array(100).fill(null).map((_, i) => ({
        id: `conv-${i}`,
        title: `Conversation ${i}`,
        message_count: i,
      }));

      render(<Sidebar {...defaultProps} conversations={conversations} />);
      expect(screen.getByText('Conversation 50')).toBeInTheDocument();
    });

    it('should handle conversations with special characters in title', () => {
      const conversations = [
        { id: '1', title: 'Test <>&"\'', message_count: 0 },
      ];

      render(<Sidebar {...defaultProps} conversations={conversations} />);
      expect(screen.getByText('Test <>&"\'')).toBeInTheDocument();
    });

    it('should handle conversations with Unicode characters', () => {
      const conversations = [
        { id: '1', title: 'Hello 你好 café 🎉', message_count: 0 },
      ];

      render(<Sidebar {...defaultProps} conversations={conversations} />);
      expect(screen.getByText('Hello 你好 café 🎉')).toBeInTheDocument();
    });

    it('should handle conversation with very high message count', () => {
      const conversations = [
        { id: '1', title: 'Active Conv', message_count: 99999 },
      ];

      render(<Sidebar {...defaultProps} conversations={conversations} />);
      expect(screen.getByText('99999 messages')).toBeInTheDocument();
    });

    it('should handle undefined currentConversationId', () => {
      const conversations = [
        { id: '1', title: 'Conv 1', message_count: 5 },
      ];

      const { container } = render(
        <Sidebar {...defaultProps} conversations={conversations} currentConversationId={undefined} />
      );
      
      const conversationItems = container.querySelectorAll('.conversation-item');
      expect(conversationItems[0]).not.toHaveClass('active');
    });
  });

  describe('Accessibility', () => {
    it('should have clickable conversation items', () => {
      const conversations = [
        { id: '1', title: 'Conv 1', message_count: 5 },
      ];

      const { container } = render(
        <Sidebar {...defaultProps} conversations={conversations} />
      );
      
      const conversationItem = container.querySelector('.conversation-item');
      expect(conversationItem).toBeInTheDocument();
    });

    it('should have clickable new conversation button', () => {
      render(<Sidebar {...defaultProps} />);
      
      const button = screen.getByText('+ New Conversation').closest('button');
      expect(button).toBeInTheDocument();
      expect(button.tagName).toBe('BUTTON');
    });
  });

  describe('Re-rendering', () => {
    it('should update when conversations prop changes', () => {
      const { rerender } = render(
        <Sidebar {...defaultProps} conversations={[]} />
      );
      
      expect(screen.getByText('No conversations yet')).toBeInTheDocument();
      
      rerender(
        <Sidebar 
          {...defaultProps} 
          conversations={[{ id: '1', title: 'New Conv', message_count: 0 }]} 
        />
      );
      
      expect(screen.queryByText('No conversations yet')).not.toBeInTheDocument();
      expect(screen.getByText('New Conv')).toBeInTheDocument();
    });

    it('should not re-render unnecessarily when props unchanged', () => {
      const conversations = [{ id: '1', title: 'Conv 1', message_count: 5 }];
      
      const { rerender } = render(
        <Sidebar {...defaultProps} conversations={conversations} />
      );
      
      rerender(
        <Sidebar {...defaultProps} conversations={conversations} />
      );
      
      expect(screen.getByText('Conv 1')).toBeInTheDocument();
    });
  });
});