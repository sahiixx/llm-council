import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Sidebar from '../../components/Sidebar';

describe('Sidebar', () => {
  const mockConversations = [
    { id: '1', title: 'First', message_count: 2, created_at: '2024-01-01' },
    { id: '2', title: 'Second', message_count: 5, created_at: '2024-01-02' },
  ];

  it('renders title and new conversation button', () => {
    render(
      <Sidebar
        conversations={[]}
        currentConversationId={null}
        onSelectConversation={vi.fn()}
        onNewConversation={vi.fn()}
      />
    );

    expect(screen.getByText('LLM Council')).toBeInTheDocument();
    expect(screen.getByText('+ New Conversation')).toBeInTheDocument();
  });

  it('displays empty state when no conversations', () => {
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

  it('displays list of conversations', () => {
    render(
      <Sidebar
        conversations={mockConversations}
        currentConversationId={null}
        onSelectConversation={vi.fn()}
        onNewConversation={vi.fn()}
      />
    );

    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
    expect(screen.getByText('2 messages')).toBeInTheDocument();
    expect(screen.getByText('5 messages')).toBeInTheDocument();
  });

  it('highlights active conversation', () => {
    const { container } = render(
      <Sidebar
        conversations={mockConversations}
        currentConversationId="1"
        onSelectConversation={vi.fn()}
        onNewConversation={vi.fn()}
      />
    );

    const activeItem = container.querySelector('.conversation-item.active');
    expect(activeItem).toBeInTheDocument();
    expect(activeItem).toHaveTextContent('First');
  });

  it('calls onNewConversation when button clicked', async () => {
    const handleNew = vi.fn();
    render(
      <Sidebar
        conversations={[]}
        currentConversationId={null}
        onSelectConversation={vi.fn()}
        onNewConversation={handleNew}
      />
    );

    await userEvent.click(screen.getByText('+ New Conversation'));
    expect(handleNew).toHaveBeenCalledOnce();
  });

  it('calls onSelectConversation when item clicked', async () => {
    const handleSelect = vi.fn();
    render(
      <Sidebar
        conversations={mockConversations}
        currentConversationId={null}
        onSelectConversation={handleSelect}
        onNewConversation={vi.fn()}
      />
    );

    await userEvent.click(screen.getByText('First'));
    expect(handleSelect).toHaveBeenCalledWith('1');
  });

  it('displays fallback title for untitled conversations', () => {
    const convs = [{ id: '1', title: null, message_count: 0, created_at: '2024-01-01' }];
    render(
      <Sidebar
        conversations={convs}
        currentConversationId={null}
        onSelectConversation={vi.fn()}
        onNewConversation={vi.fn()}
      />
    );

    expect(screen.getByText('New Conversation')).toBeInTheDocument();
  });
});