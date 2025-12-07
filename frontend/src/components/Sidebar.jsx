import './Sidebar.css';

/**
 * Renders the sidebar UI for managing and selecting conversations.
 *
 * @param {Object[]} conversations - Array of conversation objects to display; each object should include at least `id`, `title`, and `message_count`.
 * @param {(string|number|null)} currentConversationId - ID of the currently active conversation, used to highlight the active item.
 * @param {(id: string|number) => void} onSelectConversation - Callback invoked with a conversation ID when a conversation item is clicked.
 * @param {() => void} onNewConversation - Callback invoked when the "+ New Conversation" button is clicked.
 * @returns {JSX.Element} The rendered sidebar element containing the header, new-conversation button, and conversation list (or empty state).
 */
export default function Sidebar({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
}) {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h1>LLM Council</h1>
        <button className="new-conversation-btn" onClick={onNewConversation}>
          + New Conversation
        </button>
      </div>

      <div className="conversation-list">
        {conversations.length === 0 ? (
          <div className="no-conversations">No conversations yet</div>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv.id}
              className={`conversation-item ${
                conv.id === currentConversationId ? 'active' : ''
              }`}
              onClick={() => onSelectConversation(conv.id)}
            >
              <div className="conversation-title">
                {conv.title || 'New Conversation'}
              </div>
              <div className="conversation-meta">
                {conv.message_count} messages
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}