"""Tests for backend/storage.py"""
import json
import os
import pytest
import tempfile
import shutil
from pathlib import Path
from datetime import datetime
from unittest.mock import patch, mock_open
from backend import storage


@pytest.fixture
def temp_data_dir():
    """Create a temporary data directory for testing."""
    temp_dir = tempfile.mkdtemp()
    with patch('backend.storage.DATA_DIR', temp_dir):
        yield temp_dir
    shutil.rmtree(temp_dir, ignore_errors=True)


class TestStorageUtilities:
    """Test suite for storage utility functions."""

    def test_ensure_data_dir_creates_directory(self, temp_data_dir):
        """Test that ensure_data_dir creates the directory."""
        # Remove the directory first
        if os.path.exists(temp_data_dir):
            shutil.rmtree(temp_data_dir)

        storage.ensure_data_dir()
        assert os.path.exists(temp_data_dir)
        assert os.path.isdir(temp_data_dir)

    def test_ensure_data_dir_idempotent(self, temp_data_dir):
        """Test that ensure_data_dir can be called multiple times."""
        storage.ensure_data_dir()
        storage.ensure_data_dir()
        assert os.path.exists(temp_data_dir)

    def test_get_conversation_path(self, temp_data_dir):
        """Test conversation path generation."""
        conv_id = 'test-123'
        path = storage.get_conversation_path(conv_id)
        assert path.endswith('test-123.json')
        assert temp_data_dir in path


class TestCreateConversation:
    """Test suite for create_conversation function."""

    def test_create_conversation_returns_dict(self, temp_data_dir):
        """Test that create_conversation returns a dictionary."""
        conv = storage.create_conversation('test-id')
        assert isinstance(conv, dict)

    def test_create_conversation_has_required_fields(self, temp_data_dir):
        """Test that created conversation has all required fields."""
        conv = storage.create_conversation('test-id')
        assert 'id' in conv
        assert 'created_at' in conv
        assert 'title' in conv
        assert 'messages' in conv

    def test_create_conversation_correct_id(self, temp_data_dir):
        """Test that conversation has correct ID."""
        conv_id = 'unique-test-id-123'
        conv = storage.create_conversation(conv_id)
        assert conv['id'] == conv_id

    def test_create_conversation_has_timestamp(self, temp_data_dir):
        """Test that conversation has valid timestamp."""
        conv = storage.create_conversation('test-id')
        # Verify it's a valid ISO format timestamp
        datetime.fromisoformat(conv['created_at'])

    def test_create_conversation_default_title(self, temp_data_dir):
        """Test that conversation has default title."""
        conv = storage.create_conversation('test-id')
        assert conv['title'] == 'New Conversation'

    def test_create_conversation_empty_messages(self, temp_data_dir):
        """Test that new conversation has empty messages."""
        conv = storage.create_conversation('test-id')
        assert conv['messages'] == []
        assert isinstance(conv['messages'], list)

    def test_create_conversation_saves_to_file(self, temp_data_dir):
        """Test that conversation is saved to file."""
        conv_id = 'test-save-id'
        storage.create_conversation(conv_id)
        
        path = storage.get_conversation_path(conv_id)
        assert os.path.exists(path)

    def test_create_conversation_file_content(self, temp_data_dir):
        """Test that saved file has correct content."""
        conv_id = 'test-content-id'
        conv = storage.create_conversation(conv_id)
        
        path = storage.get_conversation_path(conv_id)
        with open(path, 'r') as f:
            saved_data = json.load(f)
        
        assert saved_data == conv

    def test_create_conversation_json_format(self, temp_data_dir):
        """Test that conversation is saved as valid JSON."""
        conv_id = 'test-json-id'
        storage.create_conversation(conv_id)
        
        path = storage.get_conversation_path(conv_id)
        with open(path, 'r') as f:
            # This will raise if JSON is invalid
            json.load(f)


class TestGetConversation:
    """Test suite for get_conversation function."""

    def test_get_existing_conversation(self, temp_data_dir):
        """Test retrieving an existing conversation."""
        conv_id = 'test-get-id'
        created_conv = storage.create_conversation(conv_id)
        
        retrieved_conv = storage.get_conversation(conv_id)
        assert retrieved_conv == created_conv

    def test_get_nonexistent_conversation(self, temp_data_dir):
        """Test that getting non-existent conversation returns None."""
        result = storage.get_conversation('nonexistent-id')
        assert result is None

    def test_get_conversation_preserves_data(self, temp_data_dir):
        """Test that retrieved conversation has all original data."""
        conv_id = 'test-preserve-id'
        original = storage.create_conversation(conv_id)
        
        retrieved = storage.get_conversation(conv_id)
        assert retrieved['id'] == original['id']
        assert retrieved['created_at'] == original['created_at']
        assert retrieved['title'] == original['title']
        assert retrieved['messages'] == original['messages']

    def test_get_conversation_handles_corrupted_json(self, temp_data_dir):
        """Test handling of corrupted JSON files."""
        conv_id = 'corrupted-id'
        path = storage.get_conversation_path(conv_id)
        
        # Create directory
        storage.ensure_data_dir()
        
        # Write invalid JSON
        with open(path, 'w') as f:
            f.write('{ invalid json }')
        
        # Should raise or return None
        with pytest.raises(json.JSONDecodeError):
            storage.get_conversation(conv_id)


class TestSaveConversation:
    """Test suite for save_conversation function."""

    def test_save_conversation_creates_file(self, temp_data_dir):
        """Test that save_conversation creates a file."""
        conv = {
            'id': 'test-save',
            'created_at': datetime.utcnow().isoformat(),
            'title': 'Test',
            'messages': []
        }
        
        storage.save_conversation(conv)
        path = storage.get_conversation_path('test-save')
        assert os.path.exists(path)

    def test_save_conversation_overwrites(self, temp_data_dir):
        """Test that save_conversation overwrites existing data."""
        conv_id = 'test-overwrite'
        conv = storage.create_conversation(conv_id)
        
        # Modify and save
        conv['title'] = 'Updated Title'
        storage.save_conversation(conv)
        
        # Retrieve and verify
        retrieved = storage.get_conversation(conv_id)
        assert retrieved['title'] == 'Updated Title'

    def test_save_conversation_preserves_all_fields(self, temp_data_dir):
        """Test that all fields are preserved when saving."""
        conv = {
            'id': 'test-fields',
            'created_at': '2024-01-01T00:00:00',
            'title': 'Custom Title',
            'messages': [
                {'role': 'user', 'content': 'Hello'},
                {'role': 'assistant', 'stage1': [], 'stage2': [], 'stage3': {}}
            ]
        }
        
        storage.save_conversation(conv)
        retrieved = storage.get_conversation('test-fields')
        
        assert retrieved == conv


class TestListConversations:
    """Test suite for list_conversations function."""

    def test_list_empty_conversations(self, temp_data_dir):
        """Test listing when no conversations exist."""
        convs = storage.list_conversations()
        assert isinstance(convs, list)
        assert len(convs) == 0

    def test_list_single_conversation(self, temp_data_dir):
        """Test listing a single conversation."""
        storage.create_conversation('test-1')
        convs = storage.list_conversations()
        assert len(convs) == 1

    def test_list_multiple_conversations(self, temp_data_dir):
        """Test listing multiple conversations."""
        storage.create_conversation('test-1')
        storage.create_conversation('test-2')
        storage.create_conversation('test-3')
        
        convs = storage.list_conversations()
        assert len(convs) == 3

    def test_list_returns_metadata_only(self, temp_data_dir):
        """Test that list returns metadata, not full messages."""
        conv_id = 'test-metadata'
        storage.create_conversation(conv_id)
        
        convs = storage.list_conversations()
        conv = convs[0]
        
        assert 'id' in conv
        assert 'created_at' in conv
        assert 'title' in conv
        assert 'message_count' in conv
        assert 'messages' not in conv

    def test_list_message_count_correct(self, temp_data_dir):
        """Test that message_count is correct."""
        conv_id = 'test-count'
        storage.create_conversation(conv_id)
        storage.add_user_message(conv_id, 'Message 1')
        storage.add_user_message(conv_id, 'Message 2')
        
        convs = storage.list_conversations()
        conv = convs[0]
        assert conv['message_count'] == 2

    def test_list_sorted_by_creation_time(self, temp_data_dir):
        """Test that conversations are sorted newest first."""
        import time
        
        storage.create_conversation('old')
        time.sleep(0.01)
        storage.create_conversation('new')
        
        convs = storage.list_conversations()
        assert convs[0]['id'] == 'new'
        assert convs[1]['id'] == 'old'


class TestAddUserMessage:
    """Test suite for add_user_message function."""

    def test_add_user_message_success(self, temp_data_dir):
        """Test adding a user message successfully."""
        conv_id = 'test-user-msg'
        storage.create_conversation(conv_id)
        
        storage.add_user_message(conv_id, 'Hello, world!')
        
        conv = storage.get_conversation(conv_id)
        assert len(conv['messages']) == 1
        assert conv['messages'][0]['role'] == 'user'
        assert conv['messages'][0]['content'] == 'Hello, world!'

    def test_add_multiple_user_messages(self, temp_data_dir):
        """Test adding multiple user messages."""
        conv_id = 'test-multi-msg'
        storage.create_conversation(conv_id)
        
        storage.add_user_message(conv_id, 'Message 1')
        storage.add_user_message(conv_id, 'Message 2')
        storage.add_user_message(conv_id, 'Message 3')
        
        conv = storage.get_conversation(conv_id)
        assert len(conv['messages']) == 3

    def test_add_user_message_nonexistent_conversation(self, temp_data_dir):
        """Test adding message to non-existent conversation raises error."""
        with pytest.raises(ValueError, match="not found"):
            storage.add_user_message('nonexistent', 'message')

    def test_add_user_message_empty_content(self, temp_data_dir):
        """Test adding user message with empty content."""
        conv_id = 'test-empty'
        storage.create_conversation(conv_id)
        
        storage.add_user_message(conv_id, '')
        
        conv = storage.get_conversation(conv_id)
        assert conv['messages'][0]['content'] == ''

    def test_add_user_message_special_characters(self, temp_data_dir):
        """Test adding user message with special characters."""
        conv_id = 'test-special'
        storage.create_conversation(conv_id)
        
        content = 'Hello! @#$% <html> "quotes" \'apostrophes\' \n newlines'
        storage.add_user_message(conv_id, content)
        
        conv = storage.get_conversation(conv_id)
        assert conv['messages'][0]['content'] == content


class TestAddAssistantMessage:
    """Test suite for add_assistant_message function."""

    def test_add_assistant_message_success(self, temp_data_dir):
        """Test adding assistant message successfully."""
        conv_id = 'test-assistant'
        storage.create_conversation(conv_id)
        
        stage1 = [{'model': 'model1', 'response': 'response1'}]
        stage2 = [{'model': 'model1', 'ranking': 'ranking1'}]
        stage3 = {'model': 'chairman', 'response': 'final'}
        
        storage.add_assistant_message(conv_id, stage1, stage2, stage3)
        
        conv = storage.get_conversation(conv_id)
        assert len(conv['messages']) == 1
        msg = conv['messages'][0]
        assert msg['role'] == 'assistant'
        assert msg['stage1'] == stage1
        assert msg['stage2'] == stage2
        assert msg['stage3'] == stage3

    def test_add_assistant_message_nonexistent_conversation(self, temp_data_dir):
        """Test adding assistant message to non-existent conversation."""
        with pytest.raises(ValueError, match="not found"):
            storage.add_assistant_message('nonexistent', [], [], {})

    def test_add_assistant_message_empty_stages(self, temp_data_dir):
        """Test adding assistant message with empty stages."""
        conv_id = 'test-empty-stages'
        storage.create_conversation(conv_id)
        
        storage.add_assistant_message(conv_id, [], [], {})
        
        conv = storage.get_conversation(conv_id)
        msg = conv['messages'][0]
        assert msg['stage1'] == []
        assert msg['stage2'] == []
        assert msg['stage3'] == {}


class TestUpdateConversationTitle:
    """Test suite for update_conversation_title function."""

    def test_update_title_success(self, temp_data_dir):
        """Test updating conversation title successfully."""
        conv_id = 'test-title'
        storage.create_conversation(conv_id)
        
        new_title = 'Updated Title'
        storage.update_conversation_title(conv_id, new_title)
        
        conv = storage.get_conversation(conv_id)
        assert conv['title'] == new_title

    def test_update_title_nonexistent_conversation(self, temp_data_dir):
        """Test updating title of non-existent conversation."""
        with pytest.raises(ValueError, match="not found"):
            storage.update_conversation_title('nonexistent', 'title')

    def test_update_title_preserves_other_fields(self, temp_data_dir):
        """Test that updating title doesn't affect other fields."""
        conv_id = 'test-preserve'
        original = storage.create_conversation(conv_id)
        storage.add_user_message(conv_id, 'test message')
        
        storage.update_conversation_title(conv_id, 'New Title')
        
        updated = storage.get_conversation(conv_id)
        assert updated['id'] == original['id']
        assert updated['created_at'] == original['created_at']
        assert len(updated['messages']) == 1

    def test_update_title_empty_string(self, temp_data_dir):
        """Test updating title to empty string."""
        conv_id = 'test-empty-title'
        storage.create_conversation(conv_id)
        
        storage.update_conversation_title(conv_id, '')
        
        conv = storage.get_conversation(conv_id)
        assert conv['title'] == ''

    def test_update_title_special_characters(self, temp_data_dir):
        """Test updating title with special characters."""
        conv_id = 'test-special-title'
        storage.create_conversation(conv_id)
        
        title = 'Title with émojis 🚀 and "quotes"'
        storage.update_conversation_title(conv_id, title)
        
        conv = storage.get_conversation(conv_id)
        assert conv['title'] == title