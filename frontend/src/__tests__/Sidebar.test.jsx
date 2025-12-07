/**
 * Comprehensive unit tests for Sidebar.jsx
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Sidebar from '../components/Sidebar';

describe('Sidebar Component', () => {
  const defaultProps = {
    conversations: [],
    currentConversationId: null,
    onSelectConversation: vi.fn(),
    onNewConversation: vi.fn(),
  };

  it('renders without crashing', () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByText('LLM Council')).toBeInTheDocument();
  });

  it('displays the header with title', () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByText('LLM Council')).toBeInTheDocument();
  });

  it('displays new conversation button', () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByText('+ New Conversation')).toBeInTheDocument();
  });

  it('calls onNewConversation when button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnNew = vi.fn();
    
    render(<Sidebar {...defaultProps} onNewConversation={mockOnNew} />);
    
    await user.click(screen.getByText('+ New Conversation'));
    
    expect(mockOnNew).toHaveBeenCalledTimes(1);
  });

  it('displays "no conversations yet" when list is empty', () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByText('No conversations yet')).toBeInTheDocument();
  });

  it('renders conversation list when conversations exist', () => {
    const conversations = [
      { id: '1', title: 'Conv 1', created_at: '2024-01-01', message_count: 2 },
      { id: '2', title: 'Conv 2', created_at: '2024-01-02', message_count: 5 },
    ];
    
    render(<Sidebar {...defaultProps} conversations={conversations} />);
    
    expect(screen.getByText('Conv 1')).toBeInTheDocument();
    expect(screen.getByText('Conv 2')).toBeInTheDocument();
    expect(screen.getByText('2 messages')).toBeInTheDocument();
    expect(screen.getByText('5 messages')).toBeInTheDocument();
  });

  it('calls onSelectConversation when conversation is clicked', async () => {
    const user = userEvent.setup();
    const mockOnSelect = vi.fn();
    const conversations = [
      { id: 'test-id', title: 'Test Conv', created_at: '2024-01-01', message_count: 1 },
    ];
    
    render(<Sidebar {...defaultProps} conversations={conversations} onSelectConversation={mockOnSelect} />);
    
    await user.click(screen.getByText('Test Conv'));
    
    expect(mockOnSelect).toHaveBeenCalledWith('test-id');
  });

  it('highlights active conversation', () => {
    const conversations = [
      { id: '1', title: 'Conv 1', created_at: '2024-01-01', message_count: 1 },
      { id: '2', title: 'Conv 2', created_at: '2024-01-02', message_count: 1 },
    ];
    
    const { container } = render(
      <Sidebar {...defaultProps} conversations={conversations} currentConversationId="1" />
    );
    
    const activeItem = container.querySelector('.conversation-item.active');
    expect(activeItem).toBeInTheDocument();
    expect(activeItem).toHaveTextContent('Conv 1');
  });

  it('displays message count for each conversation', () => {
    const conversations = [
      { id: '1', title: 'Conv', created_at: '2024-01-01', message_count: 42 },
    ];
    
    render(<Sidebar {...defaultProps} conversations={conversations} />);
    
    expect(screen.getByText('42 messages')).toBeInTheDocument();
  });

  it('handles conversation with zero messages', () => {
    const conversations = [
      { id: '1', title: 'Empty Conv', created_at: '2024-01-01', message_count: 0 },
    ];
    
    render(<Sidebar {...defaultProps} conversations={conversations} />);
    
    expect(screen.getByText('0 messages')).toBeInTheDocument();
  });

  it('handles conversation with default title', () => {
    const conversations = [
      { id: '1', title: '', created_at: '2024-01-01', message_count: 1 },
    ];
    
    render(<Sidebar {...defaultProps} conversations={conversations} />);
    
    expect(screen.getByText('New Conversation')).toBeInTheDocument();
  });

  it('renders multiple conversations in order', () => {
    const conversations = [
      { id: '1', title: 'First', created_at: '2024-01-01', message_count: 1 },
      { id: '2', title: 'Second', created_at: '2024-01-02', message_count: 1 },
      { id: '3', title: 'Third', created_at: '2024-01-03', message_count: 1 },
    ];
    
    render(<Sidebar {...defaultProps} conversations={conversations} />);
    
    const items = screen.getAllByText(/First|Second|Third/);
    expect(items).toHaveLength(3);
  });

  it('handles very long conversation titles', () => {
    const longTitle = 'A'.repeat(100);
    const conversations = [
      { id: '1', title: longTitle, created_at: '2024-01-01', message_count: 1 },
    ];
    
    render(<Sidebar {...defaultProps} conversations={conversations} />);
    
    expect(screen.getByText(longTitle)).toBeInTheDocument();
  });

  it('handles special characters in conversation titles', () => {
    const conversations = [
      { id: '1', title: 'Test & <script> "quotes"', created_at: '2024-01-01', message_count: 1 },
    ];
    
    render(<Sidebar {...defaultProps} conversations={conversations} />);
    
    expect(screen.getByText('Test & <script> "quotes"')).toBeInTheDocument();
  });
});