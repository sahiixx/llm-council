/**
 * Comprehensive unit tests for Sidebar component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Sidebar from '../../components/Sidebar';

describe('Sidebar', () => {
  const mockConversations = [
    { id: '1', title: 'Conversation 1', message_count: 5 },
    { id: '2', title: 'Conversation 2', message_count: 3 },
    { id: '3', title: 'Conversation 3', message_count: 10 },
  ];

  const defaultProps = {
    conversations: mockConversations,
    currentConversationId: null,
    onSelectConversation: vi.fn(),
    onNewConversation: vi.fn(),
  };

  it('should render sidebar header', () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByText('LLM Council')).toBeInTheDocument();
  });

  it('should render new conversation button', () => {
    render(<Sidebar {...defaultProps} />);
    const button = screen.getByText('+ New Conversation');
    expect(button).toBeInTheDocument();
  });

  it('should call onNewConversation when button is clicked', () => {
    const mockFn = vi.fn();
    render(<Sidebar {...defaultProps} onNewConversation={mockFn} />);
    
    const button = screen.getByText('+ New Conversation');
    fireEvent.click(button);
    
    expect(mockFn).toHaveBeenCalledOnce();
  });

  it('should render all conversations', () => {
    render(<Sidebar {...defaultProps} />);
    
    expect(screen.getByText('Conversation 1')).toBeInTheDocument();
    expect(screen.getByText('Conversation 2')).toBeInTheDocument();
    expect(screen.getByText('Conversation 3')).toBeInTheDocument();
  });

  it('should display message counts', () => {
    render(<Sidebar {...defaultProps} />);
    
    expect(screen.getByText('5 messages')).toBeInTheDocument();
    expect(screen.getByText('3 messages')).toBeInTheDocument();
    expect(screen.getByText('10 messages')).toBeInTheDocument();
  });

  it('should highlight active conversation', () => {
    render(<Sidebar {...defaultProps} currentConversationId="2" />);
    
    const conversationItems = screen.getAllByText(/Conversation/);
    const activeItem = conversationItems[1].closest('.conversation-item');
    
    expect(activeItem).toHaveClass('active');
  });

  it('should call onSelectConversation when conversation is clicked', () => {
    const mockFn = vi.fn();
    render(<Sidebar {...defaultProps} onSelectConversation={mockFn} />);
    
    const conversation = screen.getByText('Conversation 1');
    fireEvent.click(conversation);
    
    expect(mockFn).toHaveBeenCalledWith('1');
  });

  it('should show empty state when no conversations exist', () => {
    render(<Sidebar {...defaultProps} conversations={[]} />);
    
    expect(screen.getByText('No conversations yet')).toBeInTheDocument();
  });

  it('should handle conversation without title', () => {
    const conversationsNoTitle = [
      { id: '1', title: null, message_count: 1 },
    ];
    
    render(<Sidebar {...defaultProps} conversations={conversationsNoTitle} />);
    
    expect(screen.getByText('New Conversation')).toBeInTheDocument();
  });

  it('should handle conversation with empty title', () => {
    const conversationsEmptyTitle = [
      { id: '1', title: '', message_count: 1 },
    ];
    
    render(<Sidebar {...defaultProps} conversations={conversationsEmptyTitle} />);
    
    expect(screen.getByText('New Conversation')).toBeInTheDocument();
  });

  it('should render multiple conversations correctly', () => {
    render(<Sidebar {...defaultProps} />);
    
    const items = screen.getAllByText(/Conversation \d/);
    expect(items).toHaveLength(3);
  });

  it('should not highlight any conversation when none is active', () => {
    render(<Sidebar {...defaultProps} currentConversationId={null} />);
    
    const items = document.querySelectorAll('.conversation-item.active');
    expect(items).toHaveLength(0);
  });

  it('should handle clicking on already active conversation', () => {
    const mockFn = vi.fn();
    render(<Sidebar {...defaultProps} currentConversationId="1" onSelectConversation={mockFn} />);
    
    const conversation = screen.getByText('Conversation 1');
    fireEvent.click(conversation);
    
    expect(mockFn).toHaveBeenCalledWith('1');
  });

  it('should display singular message count correctly', () => {
    const singleMessage = [
      { id: '1', title: 'Single', message_count: 1 },
    ];
    
    render(<Sidebar {...defaultProps} conversations={singleMessage} />);
    
    // Should still say "messages" (not "message") based on implementation
    expect(screen.getByText('1 messages')).toBeInTheDocument();
  });

  it('should handle zero message count', () => {
    const zeroMessages = [
      { id: '1', title: 'Empty', message_count: 0 },
    ];
    
    render(<Sidebar {...defaultProps} conversations={zeroMessages} />);
    
    expect(screen.getByText('0 messages')).toBeInTheDocument();
  });

  it('should handle very long conversation titles', () => {
    const longTitle = [
      { id: '1', title: 'A'.repeat(100), message_count: 5 },
    ];
    
    render(<Sidebar {...defaultProps} conversations={longTitle} />);
    
    expect(screen.getByText('A'.repeat(100))).toBeInTheDocument();
  });

  it('should handle special characters in conversation titles', () => {
    const specialChars = [
      { id: '1', title: 'Test & Special <chars>', message_count: 1 },
    ];
    
    render(<Sidebar {...defaultProps} conversations={specialChars} />);
    
    expect(screen.getByText('Test & Special <chars>')).toBeInTheDocument();
  });

  it('should maintain conversation order', () => {
    render(<Sidebar {...defaultProps} />);
    
    const items = screen.getAllByText(/Conversation \d/);
    expect(items[0]).toHaveTextContent('Conversation 1');
    expect(items[1]).toHaveTextContent('Conversation 2');
    expect(items[2]).toHaveTextContent('Conversation 3');
  });
});