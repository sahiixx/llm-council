"""Tests for backend/storage.py module."""

import pytest
import json
import os
from pathlib import Path
from datetime import datetime
from backend import storage


def test_ensure_data_dir_creates_directory(temp_data_dir):
    """Test that ensure_data_dir creates the data directory."""
    # Remove directory first
    import shutil
    shutil.rmtree(temp_data_dir, ignore_errors=True)
    
    assert not os.path.exists(temp_data_dir)
    storage.ensure_data_dir()
    assert os.path.exists(temp_data_dir)
    assert os.path.isdir(temp_data_dir)


def test_ensure_data_dir_handles_existing_directory(temp_data_dir):
    """Test that ensure_data_dir works with existing directory."""
    # Should not raise an error
    storage.ensure_data_dir()
    storage.ensure_data_dir()  # Call twice
    assert os.path.exists(temp_data_dir)


def test_get_conversation_path_returns_correct_path(temp_data_dir):
    """Test that conversation path is correctly constructed."""
    conv_id = "test-123"
    expected_path = os.path.join(temp_data_dir, f"{conv_id}.json")
    
    actual_path = storage.get_conversation_path(conv_id)
    
    assert actual_path == expected_path
    assert actual_path.endswith(".json")


def test_create_conversation_creates_file(temp_data_dir):
    """Test that create_conversation creates a JSON file."""
    conv_id = "test-conv-456"
    
    result = storage.create_conversation(conv_id)
    
    # Check returned data
    assert result["id"] == conv_id
    assert "created_at" in result
    assert result["title"] == "New Conversation"
    assert result["messages"] == []
    
    # Check file exists
    path = storage.get_conversation_path(conv_id)
    assert os.path.exists(path)
    
    # Check file contents
    with open(path, 'r') as f:
        data = json.load(f)
    assert data["id"] == conv_id


def test_create_conversation_has_valid_timestamp(temp_data_dir):
    """Test that created conversation has a valid ISO timestamp."""
    conv_id = "test-timestamp"
    
    result = storage.create_conversation(conv_id)
    
    # Should be parseable as ISO format datetime
    timestamp = datetime.fromisoformat(result["created_at"])
    assert isinstance(timestamp, datetime)


def test_get_conversation_returns_existing_conversation(temp_data_dir, sample_conversation):
    """Test that get_conversation retrieves existing conversation."""
    conv_id = sample_conversation["id"]
    
    # Create the conversation file
    path = storage.get_conversation_path(conv_id)
    with open(path, 'w') as f:
        json.dump(sample_conversation, f)
    
    result = storage.get_conversation(conv_id)
    
    assert result is not None
    assert result["id"] == conv_id
    assert result["title"] == sample_conversation["title"]


def test_get_conversation_returns_none_for_nonexistent(temp_data_dir):
    """Test that get_conversation returns None for non-existent conversation."""
    result = storage.get_conversation("nonexistent-id")
    assert result is None


def test_save_conversation_writes_to_file(temp_data_dir, sample_conversation):
    """Test that save_conversation writes data correctly."""
    storage.save_conversation(sample_conversation)
    
    path = storage.get_conversation_path(sample_conversation["id"])
    assert os.path.exists(path)
    
    with open(path, 'r') as f:
        data = json.load(f)
    
    assert data["id"] == sample_conversation["id"]
    assert data["title"] == sample_conversation["title"]


def test_save_conversation_overwrites_existing(temp_data_dir, sample_conversation):
    """Test that save_conversation overwrites existing file."""
    # Create initial conversation
    storage.save_conversation(sample_conversation)
    
    # Modify and save again
    sample_conversation["title"] = "Updated Title"
    storage.save_conversation(sample_conversation)
    
    # Verify updated data
    result = storage.get_conversation(sample_conversation["id"])
    assert result["title"] == "Updated Title"


def test_list_conversations_returns_empty_list_when_no_conversations(temp_data_dir):
    """Test that list_conversations returns empty list initially."""
    result = storage.list_conversations()
    assert isinstance(result, list)
    assert len(result) == 0


def test_list_conversations_returns_all_conversations(temp_data_dir):
    """Test that list_conversations returns all conversation metadata."""
    # Create multiple conversations
    conv1 = storage.create_conversation("conv-1")
    conv2 = storage.create_conversation("conv-2")
    
    result = storage.list_conversations()
    
    assert len(result) == 2
    ids = [conv["id"] for conv in result]
    assert "conv-1" in ids
    assert "conv-2" in ids


def test_list_conversations_returns_metadata_only(temp_data_dir):
    """Test that list_conversations returns metadata without full messages."""
    conv = storage.create_conversation("conv-meta")
    
    result = storage.list_conversations()
    
    assert len(result) == 1
    metadata = result[0]
    assert "id" in metadata
    assert "created_at" in metadata
    assert "title" in metadata
    assert "message_count" in metadata
    assert "messages" not in metadata  # Should not include full messages


def test_list_conversations_sorted_by_creation_time(temp_data_dir):
    """Test that list_conversations returns conversations sorted by creation time."""
    import time
    
    conv1 = storage.create_conversation("conv-old")
    time.sleep(0.01)  # Small delay to ensure different timestamps
    conv2 = storage.create_conversation("conv-new")
    
    result = storage.list_conversations()
    
    # Newest should be first
    assert result[0]["id"] == "conv-new"
    assert result[1]["id"] == "conv-old"


def test_add_user_message_appends_message(temp_data_dir):
    """Test that add_user_message adds a user message to conversation."""
    conv_id = "conv-user-msg"
    storage.create_conversation(conv_id)
    
    content = "Hello, world!"
    storage.add_user_message(conv_id, content)
    
    conv = storage.get_conversation(conv_id)
    assert len(conv["messages"]) == 1
    assert conv["messages"][0]["role"] == "user"
    assert conv["messages"][0]["content"] == content


def test_add_user_message_raises_error_for_nonexistent_conversation(temp_data_dir):
    """Test that add_user_message raises ValueError for non-existent conversation."""
    with pytest.raises(ValueError, match="Conversation .* not found"):
        storage.add_user_message("nonexistent", "test message")


def test_add_user_message_multiple_messages(temp_data_dir):
    """Test adding multiple user messages."""
    conv_id = "conv-multi-user"
    storage.create_conversation(conv_id)
    
    storage.add_user_message(conv_id, "First message")
    storage.add_user_message(conv_id, "Second message")
    
    conv = storage.get_conversation(conv_id)
    assert len(conv["messages"]) == 2
    assert conv["messages"][0]["content"] == "First message"
    assert conv["messages"][1]["content"] == "Second message"


def test_add_assistant_message_adds_structured_response(temp_data_dir):
    """Test that add_assistant_message adds structured assistant response."""
    conv_id = "conv-assistant"
    storage.create_conversation(conv_id)
    
    stage1 = [{"model": "test", "response": "test response"}]
    stage2 = [{"model": "test", "ranking": "test ranking"}]
    stage3 = {"model": "chairman", "response": "final response"}
    
    storage.add_assistant_message(conv_id, stage1, stage2, stage3)
    
    conv = storage.get_conversation(conv_id)
    assert len(conv["messages"]) == 1
    msg = conv["messages"][0]
    assert msg["role"] == "assistant"
    assert msg["stage1"] == stage1
    assert msg["stage2"] == stage2
    assert msg["stage3"] == stage3


def test_add_assistant_message_raises_error_for_nonexistent_conversation(temp_data_dir):
    """Test that add_assistant_message raises ValueError for non-existent conversation."""
    with pytest.raises(ValueError, match="Conversation .* not found"):
        storage.add_assistant_message("nonexistent", [], [], {})


def test_update_conversation_title_updates_title(temp_data_dir):
    """Test that update_conversation_title updates the conversation title."""
    conv_id = "conv-title"
    storage.create_conversation(conv_id)
    
    new_title = "My Custom Title"
    storage.update_conversation_title(conv_id, new_title)
    
    conv = storage.get_conversation(conv_id)
    assert conv["title"] == new_title


def test_update_conversation_title_raises_error_for_nonexistent(temp_data_dir):
    """Test that update_conversation_title raises ValueError for non-existent conversation."""
    with pytest.raises(ValueError, match="Conversation .* not found"):
        storage.update_conversation_title("nonexistent", "New Title")


def test_conversation_workflow_integration(temp_data_dir):
    """Integration test for complete conversation workflow."""
    # Create conversation
    conv_id = "integration-test"
    conv = storage.create_conversation(conv_id)
    assert conv["title"] == "New Conversation"
    
    # Update title
    storage.update_conversation_title(conv_id, "Integration Test")
    
    # Add user message
    storage.add_user_message(conv_id, "What is AI?")
    
    # Add assistant message
    stage1 = [{"model": "model1", "response": "AI is..."}]
    stage2 = [{"model": "model1", "ranking": "Rankings..."}]
    stage3 = {"model": "chairman", "response": "Final answer..."}
    storage.add_assistant_message(conv_id, stage1, stage2, stage3)
    
    # Verify final state
    final_conv = storage.get_conversation(conv_id)
    assert final_conv["title"] == "Integration Test"
    assert len(final_conv["messages"]) == 2
    assert final_conv["messages"][0]["role"] == "user"
    assert final_conv["messages"][1]["role"] == "assistant"


def test_list_conversations_counts_messages_correctly(temp_data_dir):
    """Test that message_count in list_conversations is accurate."""
    conv_id = "conv-count"
    storage.create_conversation(conv_id)
    storage.add_user_message(conv_id, "Message 1")
    storage.add_user_message(conv_id, "Message 2")
    
    conversations = storage.list_conversations()
    assert conversations[0]["message_count"] == 2


def test_conversation_persistence_across_operations(temp_data_dir):
    """Test that conversations persist correctly across multiple operations."""
    conv_id = "persist-test"
    
    # Create and modify
    storage.create_conversation(conv_id)
    storage.add_user_message(conv_id, "Test")
    
    # Read back
    conv1 = storage.get_conversation(conv_id)
    
    # Modify again
    storage.update_conversation_title(conv_id, "Persistence Test")
    
    # Read back again
    conv2 = storage.get_conversation(conv_id)
    
    assert conv2["title"] == "Persistence Test"
    assert len(conv2["messages"]) == 1
    assert conv2["messages"][0]["content"] == "Test"