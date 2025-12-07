import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Sidebar from './Sidebar';

describe('Sidebar', () => {
  const mockConversations = [
    {
      id: 'conv-1',
      title: 'Test Conversation 1',
      message_count: 5,
      created_at: '2024-01-01T00:00:00',
    },
    {
      id: 'conv-2',
      title: 'Test Conversation 2',
      message_count: 3,
      created_at: '2024-01-02T00:00:00',
    },
  ];

  describe('Rendering', () => {
    it('should render sidebar with title', () => {
      render(
        <Sidebar
          conversations={[]}
          currentConversationId={null}
          onSelectConversation={vi.fn()}
          onNewConversation={vi.fn()}
        />
      );

      expect(screen.getByText('LLM Council')).toBeInTheDocument();
    });

    it('should render new conversation button', () => {
      render(
        <Sidebar
          conversations={[]}
          currentConversationId={null}
          onSelectConversation={vi.fn()}
          onNewConversation={vi.fn()}
        />
      );

      expect(
        screen.getByRole('button', { name: /new conversation/i })
      ).toBeInTheDocument();
    });

    it('should render empty state when no conversations', () => {
      render(
        <Sidebar
          conversations={[]}
          currentConversationId={null}
          onSelectConversation={vi.fn()}
          onNewConversation={vi.fn()}
        />
      );

      expect(screen.getByText('No conversations yet')).toBeInTheDocument();
    });

    it('should render conversation list when conversations exist', () => {
      render(
        <Sidebar
          conversations={mockConversations}
          currentConversationId={null}
          onSelectConversation={vi.fn()}
          onNewConversation={vi.fn()}
        />
      );

      expect(screen.getByText('Test Conversation 1')).toBeInTheDocument();
      expect(screen.getByText('Test Conversation 2')).toBeInTheDocument();
      expect(screen.getByText('5 messages')).toBeInTheDocument();
      expect(screen.getByText('3 messages')).toBeInTheDocument();
    });

    it('should highlight active conversation', () => {
      const { container } = render(
        <Sidebar
          conversations={mockConversations}
          currentConversationId="conv-1"
          onSelectConversation={vi.fn()}
          onNewConversation={vi.fn()}
        />
      );

      const activeItem = container.querySelector('.conversation-item.active');
      expect(activeItem).toBeInTheDocument();
      expect(activeItem).toHaveTextContent('Test Conversation 1');
    });

    it('should not highlight any conversation when currentConversationId is null', () => {
      const { container } = render(
        <Sidebar
          conversations={mockConversations}
          currentConversationId={null}
          onSelectConversation={vi.fn()}
          onNewConversation={vi.fn()}
        />
      );

      const activeItems = container.querySelectorAll('.conversation-item.active');
      expect(activeItems).toHaveLength(0);
    });

    it('should display default title for conversations without title', () => {
      const conversationsWithoutTitle = [
        { id: 'conv-1', message_count: 2, created_at: '2024-01-01' },
      ];

      render(
        <Sidebar
          conversations={conversationsWithoutTitle}
          currentConversationId={null}
          onSelectConversation={vi.fn()}
          onNewConversation={vi.fn()}
        />
      );

      expect(screen.getByText('New Conversation')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should call onNewConversation when button is clicked', () => {
      const onNewConversation = vi.fn();

      render(
        <Sidebar
          conversations={[]}
          currentConversationId={null}
          onSelectConversation={vi.fn()}
          onNewConversation={onNewConversation}
        />
      );

      const button = screen.getByRole('button', { name: /new conversation/i });
      fireEvent.click(button);

      expect(onNewConversation).toHaveBeenCalledTimes(1);
    });

    it('should call onSelectConversation with correct id when conversation is clicked', () => {
      const onSelectConversation = vi.fn();

      render(
        <Sidebar
          conversations={mockConversations}
          currentConversationId={null}
          onSelectConversation={onSelectConversation}
          onNewConversation={vi.fn()}
        />
      );

      const conversation = screen.getByText('Test Conversation 1');
      fireEvent.click(conversation);

      expect(onSelectConversation).toHaveBeenCalledTimes(1);
      expect(onSelectConversation).toHaveBeenCalledWith('conv-1');
    });

    it('should call onSelectConversation for each different conversation clicked', () => {
      const onSelectConversation = vi.fn();

      render(
        <Sidebar
          conversations={mockConversations}
          currentConversationId={null}
          onSelectConversation={onSelectConversation}
          onNewConversation={vi.fn()}
        />
      );

      fireEvent.click(screen.getByText('Test Conversation 1'));
      fireEvent.click(screen.getByText('Test Conversation 2'));

      expect(onSelectConversation).toHaveBeenCalledTimes(2);
      expect(onSelectConversation).toHaveBeenNthCalledWith(1, 'conv-1');
      expect(onSelectConversation).toHaveBeenNthCalledWith(2, 'conv-2');
    });

    it('should allow clicking on active conversation', () => {
      const onSelectConversation = vi.fn();

      render(
        <Sidebar
          conversations={mockConversations}
          currentConversationId="conv-1"
          onSelectConversation={onSelectConversation}
          onNewConversation={vi.fn()}
        />
      );

      const activeConversation = screen.getByText('Test Conversation 1');
      fireEvent.click(activeConversation);

      expect(onSelectConversation).toHaveBeenCalledWith('conv-1');
    });
  });

  describe('Edge Cases', () => {
    it('should handle single conversation', () => {
      render(
        <Sidebar
          conversations={[mockConversations[0]]}
          currentConversationId={null}
          onSelectConversation={vi.fn()}
          onNewConversation={vi.fn()}
        />
      );

      expect(screen.getByText('Test Conversation 1')).toBeInTheDocument();
      expect(screen.queryByText('No conversations yet')).not.toBeInTheDocument();
    });

    it('should handle many conversations', () => {
      const manyConversations = Array.from({ length: 50 }, (_, i) => ({
        id: `conv-${i}`,
        title: `Conversation ${i}`,
        message_count: i,
        created_at: '2024-01-01',
      }));

      const { container } = render(
        <Sidebar
          conversations={manyConversations}
          currentConversationId={null}
          onSelectConversation={vi.fn()}
          onNewConversation={vi.fn()}
        />
      );

      const items = container.querySelectorAll('.conversation-item');
      expect(items).toHaveLength(50);
    });

    it('should handle conversations with zero messages', () => {
      const conversations = [
        { id: 'conv-1', title: 'Empty Conv', message_count: 0 },
      ];

      render(
        <Sidebar
          conversations={conversations}
          currentConversationId={null}
          onSelectConversation={vi.fn()}
          onNewConversation={vi.fn()}
        />
      );

      expect(screen.getByText('0 messages')).toBeInTheDocument();
    });

    it('should handle very long conversation titles', () => {
      const longTitle = 'A'.repeat(200);
      const conversations = [
        { id: 'conv-1', title: longTitle, message_count: 1 },
      ];

      render(
        <Sidebar
          conversations={conversations}
          currentConversationId={null}
          onSelectConversation={vi.fn()}
          onNewConversation={vi.fn()}
        />
      );

      expect(screen.getByText(longTitle)).toBeInTheDocument();
    });

    it('should handle special characters in titles', () => {
      const specialTitle = '<script>alert("xss")</script> & "quotes"';
      const conversations = [
        { id: 'conv-1', title: specialTitle, message_count: 1 },
      ];

      render(
        <Sidebar
          conversations={conversations}
          currentConversationId={null}
          onSelectConversation={vi.fn()}
          onNewConversation={vi.fn()}
        />
      );

      expect(screen.getByText(specialTitle)).toBeInTheDocument();
    });

    it('should handle unicode characters in titles', () => {
      const unicodeTitle = 'Test 你好 café 🎉';
      const conversations = [
        { id: 'conv-1', title: unicodeTitle, message_count: 1 },
      ];

      render(
        <Sidebar
          conversations={conversations}
          currentConversationId={null}
          onSelectConversation={vi.fn()}
          onNewConversation={vi.fn()}
        />
      );

      expect(screen.getByText(unicodeTitle)).toBeInTheDocument();
    });
  });

  describe('Props Validation', () => {
    it('should work with all required props', () => {
      expect(() => {
        render(
          <Sidebar
            conversations={[]}
            currentConversationId={null}
            onSelectConversation={vi.fn()}
            onNewConversation={vi.fn()}
          />
        );
      }).not.toThrow();
    });

    it('should handle string conversation IDs', () => {
      render(
        <Sidebar
          conversations={mockConversations}
          currentConversationId="conv-1"
          onSelectConversation={vi.fn()}
          onNewConversation={vi.fn()}
        />
      );

      expect(screen.getByText('Test Conversation 1').closest('.conversation-item')).toHaveClass('active');
    });

    it('should handle numeric conversation IDs', () => {
      const conversations = [
        { id: 123, title: 'Numeric ID', message_count: 1 },
      ];

      const onSelectConversation = vi.fn();

      render(
        <Sidebar
          conversations={conversations}
          currentConversationId={123}
          onSelectConversation={onSelectConversation}
          onNewConversation={vi.fn()}
        />
      );

      fireEvent.click(screen.getByText('Numeric ID'));
      expect(onSelectConversation).toHaveBeenCalledWith(123);
    });
  });

  describe('Accessibility', () => {
    it('should have accessible structure', () => {
      render(
        <Sidebar
          conversations={mockConversations}
          currentConversationId={null}
          onSelectConversation={vi.fn()}
          onNewConversation={vi.fn()}
        />
      );

      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'LLM Council' })).toBeInTheDocument();
    });

    it('should allow keyboard navigation to button', () => {
      render(
        <Sidebar
          conversations={[]}
          currentConversationId={null}
          onSelectConversation={vi.fn()}
          onNewConversation={vi.fn()}
        />
      );

      const button = screen.getByRole('button');
      button.focus();
      expect(button).toHaveFocus();
    });
  });
});