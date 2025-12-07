import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Sidebar from '../components/Sidebar';

describe('Sidebar Component', () => {
  const mockConversations = [
    { id: 'conv-1', title: 'First Chat', message_count: 2, created_at: '2024-01-01' },
    { id: 'conv-2', title: 'Second Chat', message_count: 4, created_at: '2024-01-02' },
    { id: 'conv-3', title: 'Third Chat', message_count: 1, created_at: '2024-01-03' },
  ];

  const defaultProps = {
    conversations: mockConversations,
    currentConversationId: null,
    onSelectConversation: vi.fn(),
    onNewConversation: vi.fn(),
  };

  describe('Rendering', () => {
    it('renders sidebar with header', () => {
      render(<Sidebar {...defaultProps} />);
      
      expect(screen.getByText('LLM Council')).toBeInTheDocument();
    });

    it('renders new conversation button', () => {
      render(<Sidebar {...defaultProps} />);
      
      const newButton = screen.getByRole('button', { name: /new conversation/i });
      expect(newButton).toBeInTheDocument();
    });

    it('renders all conversations', () => {
      render(<Sidebar {...defaultProps} />);
      
      expect(screen.getByText('First Chat')).toBeInTheDocument();
      expect(screen.getByText('Second Chat')).toBeInTheDocument();
      expect(screen.getByText('Third Chat')).toBeInTheDocument();
    });

    it('displays message counts', () => {
      render(<Sidebar {...defaultProps} />);
      
      expect(screen.getByText('2 messages')).toBeInTheDocument();
      expect(screen.getByText('4 messages')).toBeInTheDocument();
      expect(screen.getByText('1 messages')).toBeInTheDocument();
    });

    it('shows empty state when no conversations', () => {
      render(<Sidebar {...defaultProps} conversations={[]} />);
      
      expect(screen.getByText('No conversations yet')).toBeInTheDocument();
    });
  });

  describe('Active Conversation', () => {
    it('highlights active conversation', () => {
      render(<Sidebar {...defaultProps} currentConversationId="conv-2" />);
      
      const conversations = screen.getAllByRole('button').filter(
        el => el.classList.contains('conversation-item') || el.textContent.includes('messages')
      );
      
      // Find the active conversation by checking text content
      const activeConv = screen.getByText('Second Chat').closest('.conversation-item');
      expect(activeConv).toHaveClass('active');
    });

    it('does not highlight when no active conversation', () => {
      render(<Sidebar {...defaultProps} currentConversationId={null} />);
      
      const firstConv = screen.getByText('First Chat').closest('.conversation-item');
      expect(firstConv).not.toHaveClass('active');
    });

    it('only one conversation is active at a time', () => {
      const { container } = render(<Sidebar {...defaultProps} currentConversationId="conv-1" />);
      
      const activeItems = container.querySelectorAll('.conversation-item.active');
      expect(activeItems).toHaveLength(1);
    });
  });

  describe('User Interactions', () => {
    it('calls onNewConversation when button clicked', () => {
      const onNewConversation = vi.fn();
      render(<Sidebar {...defaultProps} onNewConversation={onNewConversation} />);
      
      const newButton = screen.getByRole('button', { name: /new conversation/i });
      fireEvent.click(newButton);
      
      expect(onNewConversation).toHaveBeenCalledTimes(1);
    });

    it('calls onSelectConversation when conversation clicked', () => {
      const onSelectConversation = vi.fn();
      render(<Sidebar {...defaultProps} onSelectConversation={onSelectConversation} />);
      
      const firstConv = screen.getByText('First Chat');
      fireEvent.click(firstConv);
      
      expect(onSelectConversation).toHaveBeenCalledWith('conv-1');
    });

    it('calls onSelectConversation with correct ID for different conversations', () => {
      const onSelectConversation = vi.fn();
      render(<Sidebar {...defaultProps} onSelectConversation={onSelectConversation} />);
      
      fireEvent.click(screen.getByText('Second Chat'));
      expect(onSelectConversation).toHaveBeenCalledWith('conv-2');
      
      fireEvent.click(screen.getByText('Third Chat'));
      expect(onSelectConversation).toHaveBeenCalledWith('conv-3');
    });
  });

  describe('Conversation Display', () => {
    it('handles conversations without titles', () => {
      const convsWithoutTitle = [
        { id: 'conv-1', title: '', message_count: 0, created_at: '2024-01-01' },
      ];
      
      render(<Sidebar {...defaultProps} conversations={convsWithoutTitle} />);
      
      expect(screen.getByText('New Conversation')).toBeInTheDocument();
    });

    it('handles conversations with null title', () => {
      const convsWithNullTitle = [
        { id: 'conv-1', title: null, message_count: 0, created_at: '2024-01-01' },
      ];
      
      render(<Sidebar {...defaultProps} conversations={convsWithNullTitle} />);
      
      expect(screen.getByText('New Conversation')).toBeInTheDocument();
    });

    it('handles long conversation titles', () => {
      const longTitle = 'This is a very long conversation title that might need to be truncated';
      const convsWithLongTitle = [
        { id: 'conv-1', title: longTitle, message_count: 5, created_at: '2024-01-01' },
      ];
      
      render(<Sidebar {...defaultProps} conversations={convsWithLongTitle} />);
      
      expect(screen.getByText(longTitle)).toBeInTheDocument();
    });

    it('handles conversations with special characters in title', () => {
      const specialTitle = 'Chat about C++ & "React" <Components>';
      const convsWithSpecial = [
        { id: 'conv-1', title: specialTitle, message_count: 2, created_at: '2024-01-01' },
      ];
      
      render(<Sidebar {...defaultProps} conversations={convsWithSpecial} />);
      
      expect(screen.getByText(specialTitle)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles single conversation', () => {
      const singleConv = [mockConversations[0]];
      render(<Sidebar {...defaultProps} conversations={singleConv} />);
      
      expect(screen.getByText('First Chat')).toBeInTheDocument();
      expect(screen.queryByText('Second Chat')).not.toBeInTheDocument();
    });

    it('handles many conversations', () => {
      const manyConvs = Array.from({ length: 50 }, (_, i) => ({
        id: `conv-${i}`,
        title: `Chat ${i}`,
        message_count: i,
        created_at: '2024-01-01',
      }));
      
      render(<Sidebar {...defaultProps} conversations={manyConvs} />);
      
      expect(screen.getByText('Chat 0')).toBeInTheDocument();
      expect(screen.getByText('Chat 49')).toBeInTheDocument();
    });

    it('handles conversation with zero messages', () => {
      const zeroMsgConv = [
        { id: 'conv-1', title: 'Empty Chat', message_count: 0, created_at: '2024-01-01' },
      ];
      
      render(<Sidebar {...defaultProps} conversations={zeroMsgConv} />);
      
      expect(screen.getByText('0 messages')).toBeInTheDocument();
    });

    it('handles rapid conversation selection', () => {
      const onSelectConversation = vi.fn();
      render(<Sidebar {...defaultProps} onSelectConversation={onSelectConversation} />);
      
      const firstConv = screen.getByText('First Chat');
      const secondConv = screen.getByText('Second Chat');
      
      fireEvent.click(firstConv);
      fireEvent.click(secondConv);
      fireEvent.click(firstConv);
      
      expect(onSelectConversation).toHaveBeenCalledTimes(3);
    });
  });
});