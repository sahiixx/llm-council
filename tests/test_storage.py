"""Comprehensive unit tests for backend/storage.py."""

import pytest
import json
import os
import tempfile
import shutil
from datetime import datetime
from unittest.mock import patch, MagicMock
from backend.storage import (
    ensure_data_dir,
    get_conversation_path,
    create_conversation,
    get_conversation,
    save_conversation,
    list_conversations,
    add_user_message,
    add_assistant_message,
    update_conversation_title,
)


@pytest.fixture
def temp_data_dir():
    """Create a temporary data directory for testing."""
    temp_dir = tempfile.mkdtemp()
    yield temp_dir
    shutil.rmtree(temp_dir)


@pytest.fixture
def mock_data_dir(temp_data_dir):
    """Mock DATA_DIR to use temporary directory."""
    with patch("backend.storage.DATA_DIR", temp_data_dir):
        yield temp_data_dir


class TestEnsureDataDir:
    """Tests for ensure_data_dir function."""

    def test_creates_directory_if_not_exists(self, temp_data_dir):
        """Test that ensure_data_dir creates directory if it doesn't exist."""
        test_dir = os.path.join(temp_data_dir, "new_dir")
        
        with patch("backend.storage.DATA_DIR", test_dir):
            ensure_data_dir()
            assert os.path.exists(test_dir)
            assert os.path.isdir(test_dir)

    def test_does_not_fail_if_exists(self, mock_data_dir):
        """Test that ensure_data_dir doesn't fail if directory exists."""
        # Call twice - second call should not raise
        ensure_data_dir()
        ensure_data_dir()
        assert os.path.exists(mock_data_dir)

    def test_creates_nested_directories(self, temp_data_dir):
        """Test creating nested directory structure."""
        nested_dir = os.path.join(temp_data_dir, "level1", "level2", "level3")
        
        with patch("backend.storage.DATA_DIR", nested_dir):
            ensure_data_dir()
            assert os.path.exists(nested_dir)


class TestGetConversationPath:
    """Tests for get_conversation_path function."""

    def test_returns_correct_path(self, mock_data_dir):
        """Test that get_conversation_path returns correct file path."""
        conv_id = "test-123"
        expected = os.path.join(mock_data_dir, "test-123.json")
        
        result = get_conversation_path(conv_id)
        assert result == expected

    def test_handles_special_characters(self, mock_data_dir):
        """Test path generation with special characters in ID."""
        conv_id = "test-123-abc_xyz"
        result = get_conversation_path(conv_id)
        assert result.endswith("test-123-abc_xyz.json")

    def test_different_ids_different_paths(self, mock_data_dir):
        """Test that different IDs produce different paths."""
        path1 = get_conversation_path("id1")
        path2 = get_conversation_path("id2")
        assert path1 != path2


class TestCreateConversation:
    """Tests for create_conversation function."""

    def test_creates_new_conversation(self, mock_data_dir):
        """Test creating a new conversation."""
        conv_id = "test-conv-1"
        
        result = create_conversation(conv_id)
        
        assert result["id"] == conv_id
        assert "created_at" in result
        assert result["title"] == "New Conversation"
        assert result["messages"] == []

    def test_saves_to_file(self, mock_data_dir):
        """Test that conversation is saved to file."""
        conv_id = "test-conv-2"
        
        create_conversation(conv_id)
        
        file_path = get_conversation_path(conv_id)
        assert os.path.exists(file_path)
        
        with open(file_path, 'r') as f:
            data = json.load(f)
            assert data["id"] == conv_id

    def test_creates_valid_json(self, mock_data_dir):
        """Test that created file contains valid JSON."""
        conv_id = "test-conv-3"
        
        create_conversation(conv_id)
        
        file_path = get_conversation_path(conv_id)
        with open(file_path, 'r') as f:
            data = json.load(f)  # Should not raise
            assert isinstance(data, dict)

    def test_created_at_is_iso_format(self, mock_data_dir):
        """Test that created_at is in ISO format."""
        conv_id = "test-conv-4"
        
        result = create_conversation(conv_id)
        
        # Should be able to parse as datetime
        datetime.fromisoformat(result["created_at"])


class TestGetConversation:
    """Tests for get_conversation function."""

    def test_returns_existing_conversation(self, mock_data_dir):
        """Test retrieving an existing conversation."""
        conv_id = "test-conv-5"
        create_conversation(conv_id)
        
        result = get_conversation(conv_id)
        
        assert result is not None
        assert result["id"] == conv_id

    def test_returns_none_for_nonexistent(self, mock_data_dir):
        """Test that None is returned for non-existent conversation."""
        result = get_conversation("nonexistent-id")
        assert result is None

    def test_returns_complete_conversation(self, mock_data_dir):
        """Test that all conversation fields are returned."""
        conv_id = "test-conv-6"
        create_conversation(conv_id)
        
        result = get_conversation(conv_id)
        
        assert "id" in result
        assert "created_at" in result
        assert "title" in result
        assert "messages" in result


class TestSaveConversation:
    """Tests for save_conversation function."""

    def test_saves_conversation(self, mock_data_dir):
        """Test saving a conversation."""
        conv = {
            "id": "test-save-1",
            "created_at": datetime.utcnow().isoformat(),
            "title": "Test Title",
            "messages": [{"role": "user", "content": "Hello"}]
        }
        
        save_conversation(conv)
        
        file_path = get_conversation_path(conv["id"])
        assert os.path.exists(file_path)

    def test_overwrites_existing(self, mock_data_dir):
        """Test that saving overwrites existing conversation."""
        conv_id = "test-save-2"
        create_conversation(conv_id)
        
        conv = get_conversation(conv_id)
        conv["title"] = "Updated Title"
        save_conversation(conv)
        
        reloaded = get_conversation(conv_id)
        assert reloaded["title"] == "Updated Title"

    def test_saves_complex_messages(self, mock_data_dir):
        """Test saving conversation with complex message structure."""
        conv = {
            "id": "test-save-3",
            "created_at": datetime.utcnow().isoformat(),
            "title": "Complex",
            "messages": [
                {"role": "user", "content": "Q"},
                {
                    "role": "assistant",
                    "stage1": [{"model": "m1", "response": "R1"}],
                    "stage2": [{"model": "m1", "ranking": "Rank"}],
                    "stage3": {"model": "chairman", "response": "Final"}
                }
            ]
        }
        
        save_conversation(conv)
        reloaded = get_conversation(conv["id"])
        
        assert len(reloaded["messages"]) == 2
        assert reloaded["messages"][1]["stage1"][0]["model"] == "m1"


class TestListConversations:
    """Tests for list_conversations function."""

    def test_returns_empty_list_when_no_conversations(self, mock_data_dir):
        """Test that empty list is returned when no conversations exist."""
        result = list_conversations()
        assert result == []

    def test_lists_all_conversations(self, mock_data_dir):
        """Test listing multiple conversations."""
        create_conversation("conv-1")
        create_conversation("conv-2")
        create_conversation("conv-3")
        
        result = list_conversations()
        
        assert len(result) == 3
        ids = [c["id"] for c in result]
        assert "conv-1" in ids
        assert "conv-2" in ids
        assert "conv-3" in ids

    def test_returns_metadata_only(self, mock_data_dir):
        """Test that only metadata is returned, not full messages."""
        conv_id = "conv-meta"
        create_conversation(conv_id)
        
        # Add messages
        add_user_message(conv_id, "Test message")
        
        result = list_conversations()
        
        assert len(result) == 1
        assert "id" in result[0]
        assert "created_at" in result[0]
        assert "title" in result[0]
        assert "message_count" in result[0]
        assert "messages" not in result[0]  # Full messages not included

    def test_sorts_by_creation_time_newest_first(self, mock_data_dir):
        """Test that conversations are sorted by creation time, newest first."""
        import time
        
        create_conversation("conv-old")
        time.sleep(0.01)
        create_conversation("conv-new")
        
        result = list_conversations()
        
        assert result[0]["id"] == "conv-new"
        assert result[1]["id"] == "conv-old"

    def test_includes_message_count(self, mock_data_dir):
        """Test that message count is included in metadata."""
        conv_id = "conv-count"
        create_conversation(conv_id)
        add_user_message(conv_id, "Message 1")
        add_user_message(conv_id, "Message 2")
        
        result = list_conversations()
        
        conv = next(c for c in result if c["id"] == conv_id)
        assert conv["message_count"] == 2

    def test_ignores_non_json_files(self, mock_data_dir):
        """Test that non-JSON files in data dir are ignored."""
        create_conversation("valid-conv")
        
        # Create a non-JSON file
        with open(os.path.join(mock_data_dir, "readme.txt"), 'w') as f:
            f.write("Not a conversation")
        
        result = list_conversations()
        assert len(result) == 1


class TestAddUserMessage:
    """Tests for add_user_message function."""

    def test_adds_user_message(self, mock_data_dir):
        """Test adding a user message to a conversation."""
        conv_id = "conv-user-1"
        create_conversation(conv_id)
        
        add_user_message(conv_id, "Hello, world!")
        
        conv = get_conversation(conv_id)
        assert len(conv["messages"]) == 1
        assert conv["messages"][0]["role"] == "user"
        assert conv["messages"][0]["content"] == "Hello, world!"

    def test_adds_multiple_messages(self, mock_data_dir):
        """Test adding multiple user messages."""
        conv_id = "conv-user-2"
        create_conversation(conv_id)
        
        add_user_message(conv_id, "First")
        add_user_message(conv_id, "Second")
        add_user_message(conv_id, "Third")
        
        conv = get_conversation(conv_id)
        assert len(conv["messages"]) == 3

    def test_raises_for_nonexistent_conversation(self, mock_data_dir):
        """Test that ValueError is raised for non-existent conversation."""
        with pytest.raises(ValueError, match="not found"):
            add_user_message("nonexistent", "Message")

    def test_preserves_existing_messages(self, mock_data_dir):
        """Test that existing messages are preserved."""
        conv_id = "conv-user-3"
        create_conversation(conv_id)
        add_user_message(conv_id, "First")
        
        add_user_message(conv_id, "Second")
        
        conv = get_conversation(conv_id)
        assert conv["messages"][0]["content"] == "First"
        assert conv["messages"][1]["content"] == "Second"


class TestAddAssistantMessage:
    """Tests for add_assistant_message function."""

    def test_adds_assistant_message(self, mock_data_dir):
        """Test adding an assistant message with all stages."""
        conv_id = "conv-asst-1"
        create_conversation(conv_id)
        
        stage1 = [{"model": "m1", "response": "R1"}]
        stage2 = [{"model": "m1", "ranking": "Rank"}]
        stage3 = {"model": "chairman", "response": "Final"}
        
        add_assistant_message(conv_id, stage1, stage2, stage3)
        
        conv = get_conversation(conv_id)
        assert len(conv["messages"]) == 1
        assert conv["messages"][0]["role"] == "assistant"
        assert conv["messages"][0]["stage1"] == stage1
        assert conv["messages"][0]["stage2"] == stage2
        assert conv["messages"][0]["stage3"] == stage3

    def test_raises_for_nonexistent_conversation(self, mock_data_dir):
        """Test that ValueError is raised for non-existent conversation."""
        with pytest.raises(ValueError, match="not found"):
            add_assistant_message("nonexistent", [], [], {})

    def test_adds_after_user_messages(self, mock_data_dir):
        """Test adding assistant message after user messages."""
        conv_id = "conv-asst-2"
        create_conversation(conv_id)
        add_user_message(conv_id, "Question")
        
        add_assistant_message(conv_id, [], [], {"model": "m", "response": "A"})
        
        conv = get_conversation(conv_id)
        assert len(conv["messages"]) == 2
        assert conv["messages"][0]["role"] == "user"
        assert conv["messages"][1]["role"] == "assistant"


class TestUpdateConversationTitle:
    """Tests for update_conversation_title function."""

    def test_updates_title(self, mock_data_dir):
        """Test updating conversation title."""
        conv_id = "conv-title-1"
        create_conversation(conv_id)
        
        update_conversation_title(conv_id, "New Title")
        
        conv = get_conversation(conv_id)
        assert conv["title"] == "New Title"

    def test_raises_for_nonexistent_conversation(self, mock_data_dir):
        """Test that ValueError is raised for non-existent conversation."""
        with pytest.raises(ValueError, match="not found"):
            update_conversation_title("nonexistent", "Title")

    def test_preserves_other_fields(self, mock_data_dir):
        """Test that other fields are preserved when updating title."""
        conv_id = "conv-title-2"
        create_conversation(conv_id)
        add_user_message(conv_id, "Message")
        
        original = get_conversation(conv_id)
        update_conversation_title(conv_id, "Updated")
        updated = get_conversation(conv_id)
        
        assert updated["id"] == original["id"]
        assert updated["created_at"] == original["created_at"]
        assert len(updated["messages"]) == len(original["messages"])

    def test_handles_special_characters_in_title(self, mock_data_dir):
        """Test updating title with special characters."""
        conv_id = "conv-title-3"
        create_conversation(conv_id)
        
        special_title = "Title with émojis 🎉 and symbols @#$%"
        update_conversation_title(conv_id, special_title)
        
        conv = get_conversation(conv_id)
        assert conv["title"] == special_title


class TestIntegrationScenarios:
    """Integration tests for complete workflows."""

    def test_complete_conversation_flow(self, mock_data_dir):
        """Test a complete conversation workflow."""
        conv_id = "integration-1"
        
        # Create conversation
        conv = create_conversation(conv_id)
        assert conv["messages"] == []
        
        # Add user message
        add_user_message(conv_id, "What is Python?")
        
        # Add assistant response
        add_assistant_message(
            conv_id,
            [{"model": "gpt-4", "response": "Python is..."}],
            [{"model": "gpt-4", "ranking": "Ranking..."}],
            {"model": "chairman", "response": "Final answer..."}
        )
        
        # Update title
        update_conversation_title(conv_id, "Python Question")
        
        # Retrieve and verify
        final_conv = get_conversation(conv_id)
        assert final_conv["title"] == "Python Question"
        assert len(final_conv["messages"]) == 2
        assert final_conv["messages"][0]["role"] == "user"
        assert final_conv["messages"][1]["role"] == "assistant"

    def test_multiple_conversations_isolation(self, mock_data_dir):
        """Test that multiple conversations don't interfere with each other."""
        conv1 = create_conversation("conv-iso-1")
        conv2 = create_conversation("conv-iso-2")
        
        add_user_message("conv-iso-1", "Message for conv 1")
        add_user_message("conv-iso-2", "Message for conv 2")
        
        retrieved1 = get_conversation("conv-iso-1")
        retrieved2 = get_conversation("conv-iso-2")
        
        assert retrieved1["messages"][0]["content"] == "Message for conv 1"
        assert retrieved2["messages"][0]["content"] == "Message for conv 2"

    def test_conversation_persistence(self, mock_data_dir):
        """Test that conversations persist across operations."""
        conv_id = "persist-test"
        
        create_conversation(conv_id)
        add_user_message(conv_id, "Test")
        
        # Simulate process restart by reloading
        conv = get_conversation(conv_id)
        assert conv is not None
        assert len(conv["messages"]) == 1


class TestEdgeCases:
    """Edge case tests."""

    def test_empty_conversation_id(self, mock_data_dir):
        """Test handling of empty conversation ID."""
        result = create_conversation("")
        assert result["id"] == ""

    def test_very_long_message(self, mock_data_dir):
        """Test handling of very long messages."""
        conv_id = "long-msg"
        create_conversation(conv_id)
        
        long_message = "A" * 100000
        add_user_message(conv_id, long_message)
        
        conv = get_conversation(conv_id)
        assert conv["messages"][0]["content"] == long_message

    def test_unicode_in_messages(self, mock_data_dir):
        """Test handling of Unicode characters in messages."""
        conv_id = "unicode-test"
        create_conversation(conv_id)
        
        unicode_msg = "Hello 世界 🌍 café"
        add_user_message(conv_id, unicode_msg)
        
        conv = get_conversation(conv_id)
        assert conv["messages"][0]["content"] == unicode_msg

    def test_special_json_characters(self, mock_data_dir):
        """Test handling of special JSON characters in content."""
        conv_id = "json-special"
        create_conversation(conv_id)
        
        special_msg = 'Message with "quotes" and \\ backslash and \n newline'
        add_user_message(conv_id, special_msg)
        
        conv = get_conversation(conv_id)
        assert conv["messages"][0]["content"] == special_msg