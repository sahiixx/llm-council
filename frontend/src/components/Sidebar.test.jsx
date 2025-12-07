/**
 * Comprehensive unit tests for frontend/src/components/Sidebar.jsx
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Sidebar from './Sidebar';

describe('Sidebar Component', () => {
  const mockConversations = [
    { id: '1', title: 'First Conversation', message_count: 5 },
    { id: '2', title: 'Second Conversation', message_count: 3 },
    { id: '3', title: null, message_count: 0 }
  ];

  describe('Rendering', () => {
    it('should render sidebar header', () => {
      render(
        <Sidebar
          conversations={[]}
          currentConversationId={null}
          onSelectConversation={() => {}}
          onNewConversation={() => {}}
        />
      );

      expect(screen.getByText('LLM Council')).toBeInTheDocument();
    });

    it('should render new conversation button', () => {
      render(
        <Sidebar
          conversations={[]}
          currentConversationId={null}
          onSelectConversation={() => {}}
          onNewConversation={() => {}}
        />
      );

      expect(screen.getByText('+ New Conversation')).toBeInTheDocument();
    });

    it('should render conversation list', () => {
      render(
        <Sidebar
          conversations={mockConversations}
          currentConversationId={null}
          onSelectConversation={() => {}}
          onNewConversation={() => {}}
        />
      );

      expect(screen.getByText('First Conversation')).toBeInTheDocument();
      expect(screen.getByText('Second Conversation')).toBeInTheDocument();
    });

    it('should show message count for each conversation', () => {
      render(
        <Sidebar
          conversations={mockConversations}
          currentConversationId={null}
          onSelectConversation={() => {}}
          onNewConversation={() => {}}
        />
      );

      expect(screen.getByText('5 messages')).toBeInTheDocument();
      expect(screen.getByText('3 messages')).toBeInTheDocument();
      expect(screen.getByText('0 messages')).toBeInTheDocument();
    });

    it('should show "New Conversation" for conversations without title', () => {
      render(
        <Sidebar
          conversations={mockConversations}
          currentConversationId={null}
          onSelectConversation={() => {}}
          onNewConversation={() => {}}
        />
      );

      // Should have two "New Conversation" texts (one in button, one in list)
      const newConvTexts = screen.getAllByText(/New Conversation/);
      expect(newConvTexts.length).toBeGreaterThanOrEqual(2);
    });

    it('should show empty state when no conversations', () => {
      render(
        <Sidebar
          conversations={[]}
          currentConversationId={null}
          onSelectConversation={() => {}}
          onNewConversation={() => {}}
        />
      );

      expect(screen.getByText('No conversations yet')).toBeInTheDocument();
    });
  });

  describe('Active State', () => {
    it('should highlight currently selected conversation', () => {
      const { container } = render(
        <Sidebar
          conversations={mockConversations}
          currentConversationId="2"
          onSelectConversation={() => {}}
          onNewConversation={() => {}}
        />
      );

      const conversationItems = container.querySelectorAll('.conversation-item');
      const activeItem = Array.from(conversationItems).find(item => 
        item.classList.contains('active')
      );

      expect(activeItem).toBeTruthy();
      expect(activeItem?.textContent).toContain('Second Conversation');
    });

    it('should not highlight any conversation when none selected', () => {
      const { container } = render(
        <Sidebar
          conversations={mockConversations}
          currentConversationId={null}
          onSelectConversation={() => {}}
          onNewConversation={() => {}}
        />
      );

      const activeItems = container.querySelectorAll('.conversation-item.active');
      expect(activeItems.length).toBe(0);
    });

    it('should update active state when selection changes', () => {
      const { container, rerender } = render(
        <Sidebar
          conversations={mockConversations}
          currentConversationId="1"
          onSelectConversation={() => {}}
          onNewConversation={() => {}}
        />
      );

      let activeItem = container.querySelector('.conversation-item.active');
      expect(activeItem?.textContent).toContain('First Conversation');

      rerender(
        <Sidebar
          conversations={mockConversations}
          currentConversationId="2"
          onSelectConversation={() => {}}
          onNewConversation={() => {}}
        />
      );

      activeItem = container.querySelector('.conversation-item.active');
      expect(activeItem?.textContent).toContain('Second Conversation');
    });
  });

  describe('User Interactions', () => {
    it('should call onNewConversation when button clicked', async () => {
      const handleNewConversation = vi.fn();

      render(
        <Sidebar
          conversations={[]}
          currentConversationId={null}
          onSelectConversation={() => {}}
          onNewConversation={handleNewConversation}
        />
      );

      await userEvent.click(screen.getByText('+ New Conversation'));

      expect(handleNewConversation).toHaveBeenCalledTimes(1);
    });

    it('should call onSelectConversation with correct id when conversation clicked', async () => {
      const handleSelectConversation = vi.fn();

      render(
        <Sidebar
          conversations={mockConversations}
          currentConversationId={null}
          onSelectConversation={handleSelectConversation}
          onNewConversation={() => {}}
        />
      );

      await userEvent.click(screen.getByText('First Conversation'));

      expect(handleSelectConversation).toHaveBeenCalledTimes(1);
      expect(handleSelectConversation).toHaveBeenCalledWith('1');
    });

    it('should call onSelectConversation when clicking different conversations', async () => {
      const handleSelectConversation = vi.fn();

      render(
        <Sidebar
          conversations={mockConversations}
          currentConversationId={null}
          onSelectConversation={handleSelectConversation}
          onNewConversation={() => {}}
        />
      );

      await userEvent.click(screen.getByText('First Conversation'));
      await userEvent.click(screen.getByText('Second Conversation'));

      expect(handleSelectConversation).toHaveBeenCalledTimes(2);
      expect(handleSelectConversation).toHaveBeenNthCalledWith(1, '1');
      expect(handleSelectConversation).toHaveBeenNthCalledWith(2, '2');
    });

    it('should allow clicking the same conversation multiple times', async () => {
      const handleSelectConversation = vi.fn();

      render(
        <Sidebar
          conversations={mockConversations}
          currentConversationId="1"
          onSelectConversation={handleSelectConversation}
          onNewConversation={() => {}}
        />
      );

      await userEvent.click(screen.getByText('First Conversation'));
      await userEvent.click(screen.getByText('First Conversation'));

      expect(handleSelectConversation).toHaveBeenCalledTimes(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long conversation titles', () => {
      const longTitleConversation = [{
        id: '1',
        title: 'A'.repeat(200),
        message_count: 1
      }];

      render(
        <Sidebar
          conversations={longTitleConversation}
          currentConversationId={null}
          onSelectConversation={() => {}}
          onNewConversation={() => {}}
        />
      );

      expect(screen.getByText('A'.repeat(200))).toBeInTheDocument();
    });

    it('should handle large number of conversations', () => {
      const manyConversations = Array.from({ length: 100 }, (_, i) => ({
        id: `conv-${i}`,
        title: `Conversation ${i}`,
        message_count: i
      }));

      render(
        <Sidebar
          conversations={manyConversations}
          currentConversationId={null}
          onSelectConversation={() => {}}
          onNewConversation={() => {}}
        />
      );

      expect(screen.getByText('Conversation 0')).toBeInTheDocument();
      expect(screen.getByText('Conversation 99')).toBeInTheDocument();
    });

    it('should handle conversations with zero messages', () => {
      const zeroMessageConv = [{
        id: '1',
        title: 'Empty Conversation',
        message_count: 0
      }];

      render(
        <Sidebar
          conversations={zeroMessageConv}
          currentConversationId={null}
          onSelectConversation={() => {}}
          onNewConversation={() => {}}
        />
      );

      expect(screen.getByText('0 messages')).toBeInTheDocument();
    });

    it('should handle special characters in conversation titles', () => {
      const specialCharConv = [{
        id: '1',
        title: 'Test <>&"\' 你好',
        message_count: 1
      }];

      render(
        <Sidebar
          conversations={specialCharConv}
          currentConversationId={null}
          onSelectConversation={() => {}}
          onNewConversation={() => {}}
        />
      );

      expect(screen.getByText('Test <>&"\' 你好')).toBeInTheDocument();
    });

    it('should handle undefined or empty title gracefully', () => {
      const undefinedTitleConv = [
        { id: '1', title: undefined, message_count: 1 },
        { id: '2', title: '', message_count: 2 }
      ];

      render(
        <Sidebar
          conversations={undefinedTitleConv}
          currentConversationId={null}
          onSelectConversation={() => {}}
          onNewConversation={() => {}}
        />
      );

      // Both should show "New Conversation" as fallback
      const newConvTexts = screen.getAllByText(/New Conversation/);
      expect(newConvTexts.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Accessibility', () => {
    it('should render clickable conversation items', () => {
      const { container } = render(
        <Sidebar
          conversations={mockConversations}
          currentConversationId={null}
          onSelectConversation={() => {}}
          onNewConversation={() => {}}
        />
      );

      const conversationItems = container.querySelectorAll('.conversation-item');
      expect(conversationItems.length).toBe(3);
    });

    it('should render clickable button for new conversation', () => {
      render(
        <Sidebar
          conversations={[]}
          currentConversationId={null}
          onSelectConversation={() => {}}
          onNewConversation={() => {}}
        />
      );

      const button = screen.getByRole('button', { name: /New Conversation/i });
      expect(button).toBeInTheDocument();
    });
  });
});