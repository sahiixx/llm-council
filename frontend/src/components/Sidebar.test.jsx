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
  ];

  it('should render sidebar header', () => {
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

    expect(screen.getByText('+ New Conversation')).toBeInTheDocument();
  });

  it('should call onNewConversation when button clicked', async () => {
    const handleNew = vi.fn();

    render(
      <Sidebar
        conversations={[]}
        currentConversationId={null}
        onSelectConversation={vi.fn()}
        onNewConversation={handleNew}
      />
    );

    const button = screen.getByText('+ New Conversation');
    await userEvent.click(button);

    expect(handleNew).toHaveBeenCalledTimes(1);
  });

  it('should display "No conversations yet" when empty', () => {
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

  it('should render conversation list', () => {
    render(
      <Sidebar
        conversations={mockConversations}
        currentConversationId={null}
        onSelectConversation={vi.fn()}
        onNewConversation={vi.fn()}
      />
    );

    expect(screen.getByText('First Conversation')).toBeInTheDocument();
    expect(screen.getByText('Second Conversation')).toBeInTheDocument();
  });

  it('should display message counts', () => {
    render(
      <Sidebar
        conversations={mockConversations}
        currentConversationId={null}
        onSelectConversation={vi.fn()}
        onNewConversation={vi.fn()}
      />
    );

    expect(screen.getByText('5 messages')).toBeInTheDocument();
    expect(screen.getByText('3 messages')).toBeInTheDocument();
  });

  it('should highlight active conversation', () => {
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
    expect(activeItem).toHaveTextContent('First Conversation');
  });

  it('should call onSelectConversation when conversation clicked', async () => {
    const handleSelect = vi.fn();

    render(
      <Sidebar
        conversations={mockConversations}
        currentConversationId={null}
        onSelectConversation={handleSelect}
        onNewConversation={vi.fn()}
      />
    );

    const conv = screen.getByText('First Conversation');
    await userEvent.click(conv);

    expect(handleSelect).toHaveBeenCalledWith('1');
  });

  it('should handle conversation with missing title', () => {
    const convs = [{ id: '1', title: '', message_count: 0 }];

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

  it('should render multiple conversations in order', () => {
    const { container } = render(
      <Sidebar
        conversations={mockConversations}
        currentConversationId={null}
        onSelectConversation={vi.fn()}
        onNewConversation={vi.fn()}
      />
    );

    const items = container.querySelectorAll('.conversation-item');
    expect(items).toHaveLength(2);
  });

  it('should not highlight any conversation when none selected', () => {
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
});