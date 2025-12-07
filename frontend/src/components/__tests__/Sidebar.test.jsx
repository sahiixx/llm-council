import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Sidebar from '../Sidebar';

describe('Sidebar Component', () => {
  const mockProps = {
    conversations: [],
    currentConversationId: null,
    onSelectConversation: vi.fn(),
    onNewConversation: vi.fn(),
  };

  it('should render sidebar with title', () => {
    render(<Sidebar {...mockProps} />);
    expect(screen.getByText('LLM Council')).toBeInTheDocument();
  });

  it('should render new conversation button', () => {
    render(<Sidebar {...mockProps} />);
    expect(screen.getByText(/New Conversation/i)).toBeInTheDocument();
  });

  it('should show empty state when no conversations', () => {
    render(<Sidebar {...mockProps} />);
    expect(screen.getByText('No conversations yet')).toBeInTheDocument();
  });

  it('should render conversation list', () => {
    const conversations = [
      { id: '1', title: 'Conv 1', message_count: 2 },
      { id: '2', title: 'Conv 2', message_count: 5 },
    ];
    render(<Sidebar {...mockProps} conversations={conversations} />);
    
    expect(screen.getByText('Conv 1')).toBeInTheDocument();
    expect(screen.getByText('Conv 2')).toBeInTheDocument();
    expect(screen.getByText('2 messages')).toBeInTheDocument();
    expect(screen.getByText('5 messages')).toBeInTheDocument();
  });

  it('should highlight active conversation', () => {
    const conversations = [
      { id: 'active-1', title: 'Active Conv', message_count: 1 },
      { id: 'inactive-2', title: 'Inactive Conv', message_count: 2 },
    ];
    render(
      <Sidebar
        {...mockProps}
        conversations={conversations}
        currentConversationId="active-1"
      />
    );
    
    const activeItem = screen.getByText('Active Conv').closest('.conversation-item');
    expect(activeItem).toHaveClass('active');
  });

  it('should call onNewConversation when button clicked', async () => {
    const user = userEvent.setup();
    const onNewConversation = vi.fn();
    
    render(<Sidebar {...mockProps} onNewConversation={onNewConversation} />);
    
    await user.click(screen.getByText(/New Conversation/i));
    expect(onNewConversation).toHaveBeenCalledOnce();
  });

  it('should call onSelectConversation when conversation clicked', async () => {
    const user = userEvent.setup();
    const onSelectConversation = vi.fn();
    const conversations = [{ id: 'conv-1', title: 'Test', message_count: 1 }];
    
    render(
      <Sidebar
        {...mockProps}
        conversations={conversations}
        onSelectConversation={onSelectConversation}
      />
    );
    
    await user.click(screen.getByText('Test'));
    expect(onSelectConversation).toHaveBeenCalledWith('conv-1');
  });

  it('should show default title for conversations without title', () => {
    const conversations = [{ id: '1', title: '', message_count: 0 }];
    render(<Sidebar {...mockProps} conversations={conversations} />);
    expect(screen.getByText('New Conversation')).toBeInTheDocument();
  });

  it('should display message count correctly', () => {
    const conversations = [
      { id: '1', title: 'One', message_count: 1 },
      { id: '2', title: 'Zero', message_count: 0 },
    ];
    render(<Sidebar {...mockProps} conversations={conversations} />);
    expect(screen.getByText('1 messages')).toBeInTheDocument();
    expect(screen.getByText('0 messages')).toBeInTheDocument();
  });
});