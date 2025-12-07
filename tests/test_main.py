"""Tests for backend/main.py FastAPI application."""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock, Mock
import json
from backend.main import app


@pytest.fixture
def client():
    """Create a test client for the FastAPI app."""
    return TestClient(app)


@pytest.fixture
def mock_storage(temp_data_dir):
    """Mock storage functions."""
    with patch('backend.main.storage') as mock:
        yield mock


def test_root_endpoint_returns_ok(client):
    """Test that root endpoint returns health check."""
    response = client.get("/")
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "service" in data


def test_list_conversations_endpoint(client, mock_storage):
    """Test listing all conversations."""
    mock_storage.list_conversations.return_value = [
        {
            "id": "conv1",
            "created_at": "2025-01-01T00:00:00",
            "title": "Test Conv 1",
            "message_count": 2
        },
        {
            "id": "conv2",
            "created_at": "2025-01-02T00:00:00",
            "title": "Test Conv 2",
            "message_count": 5
        }
    ]
    
    response = client.get("/api/conversations")
    
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["id"] == "conv1"
    assert data[1]["id"] == "conv2"


def test_list_conversations_empty(client, mock_storage):
    """Test listing conversations when none exist."""
    mock_storage.list_conversations.return_value = []
    
    response = client.get("/api/conversations")
    
    assert response.status_code == 200
    assert response.json() == []


def test_create_conversation_endpoint(client, mock_storage):
    """Test creating a new conversation."""
    mock_storage.create_conversation.return_value = {
        "id": "new-conv-123",
        "created_at": "2025-01-01T00:00:00",
        "title": "New Conversation",
        "messages": []
    }
    
    response = client.post("/api/conversations", json={})
    
    assert response.status_code == 200
    data = response.json()
    assert "id" in data
    assert data["title"] == "New Conversation"
    assert data["messages"] == []
    mock_storage.create_conversation.assert_called_once()


def test_get_conversation_endpoint(client, mock_storage):
    """Test getting a specific conversation."""
    conv_id = "test-conv-123"
    mock_storage.get_conversation.return_value = {
        "id": conv_id,
        "created_at": "2025-01-01T00:00:00",
        "title": "Test Conversation",
        "messages": [
            {"role": "user", "content": "Hello"}
        ]
    }
    
    response = client.get(f"/api/conversations/{conv_id}")
    
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == conv_id
    assert len(data["messages"]) == 1


def test_get_conversation_not_found(client, mock_storage):
    """Test getting a non-existent conversation returns 404."""
    mock_storage.get_conversation.return_value = None
    
    response = client.get("/api/conversations/nonexistent")
    
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_send_message_endpoint_first_message(client, mock_storage):
    """Test sending first message generates title."""
    conv_id = "test-conv"
    
    # Mock conversation with no messages (first message)
    mock_storage.get_conversation.return_value = {
        "id": conv_id,
        "created_at": "2025-01-01T00:00:00",
        "title": "New Conversation",
        "messages": []
    }
    
    with patch('backend.main.generate_conversation_title') as mock_title, \
         patch('backend.main.run_full_council') as mock_council:
        
        mock_title.return_value = "Generated Title"
        mock_council.return_value = (
            [{"model": "m1", "response": "r1"}],  # stage1
            [{"model": "m1", "ranking": "rank"}],  # stage2
            {"model": "chairman", "response": "final"},  # stage3
            {"label_to_model": {}, "aggregate_rankings": []}  # metadata
        )
        
        response = client.post(
            f"/api/conversations/{conv_id}/message",
            json={"content": "Test message"}
        )
        
        assert response.status_code == 200
        mock_title.assert_called_once()
        mock_storage.update_conversation_title.assert_called_once_with(
            conv_id, "Generated Title"
        )


def test_send_message_endpoint_subsequent_message(client, mock_storage):
    """Test sending subsequent message doesn't generate title."""
    conv_id = "test-conv"
    
    # Mock conversation with existing messages
    mock_storage.get_conversation.return_value = {
        "id": conv_id,
        "created_at": "2025-01-01T00:00:00",
        "title": "Existing Title",
        "messages": [{"role": "user", "content": "Previous message"}]
    }
    
    with patch('backend.main.generate_conversation_title') as mock_title, \
         patch('backend.main.run_full_council') as mock_council:
        
        mock_council.return_value = (
            [{"model": "m1", "response": "r1"}],
            [{"model": "m1", "ranking": "rank"}],
            {"model": "chairman", "response": "final"},
            {"label_to_model": {}, "aggregate_rankings": []}
        )
        
        response = client.post(
            f"/api/conversations/{conv_id}/message",
            json={"content": "Another message"}
        )
        
        assert response.status_code == 200
        mock_title.assert_not_called()


def test_send_message_saves_user_message(client, mock_storage):
    """Test that sending a message saves the user message."""
    conv_id = "test-conv"
    message_content = "Test message content"
    
    mock_storage.get_conversation.return_value = {
        "id": conv_id,
        "messages": []
    }
    
    with patch('backend.main.run_full_council') as mock_council:
        mock_council.return_value = ([], [], {}, {})
        
        client.post(
            f"/api/conversations/{conv_id}/message",
            json={"content": message_content}
        )
        
        mock_storage.add_user_message.assert_called_once_with(
            conv_id, message_content
        )


def test_send_message_runs_council_process(client, mock_storage):
    """Test that sending a message runs the full council process."""
    conv_id = "test-conv"
    message_content = "What is AI?"
    
    mock_storage.get_conversation.return_value = {
        "id": conv_id,
        "messages": []
    }
    
    with patch('backend.main.run_full_council') as mock_council:
        mock_council.return_value = (
            [{"model": "m1", "response": "AI is..."}],
            [{"model": "m1", "ranking": "rankings..."}],
            {"model": "chairman", "response": "Final answer..."},
            {"label_to_model": {"Response A": "m1"}, "aggregate_rankings": []}
        )
        
        response = client.post(
            f"/api/conversations/{conv_id}/message",
            json={"content": message_content}
        )
        
        mock_council.assert_called_once_with(message_content)
        assert response.status_code == 200
        data = response.json()
        assert "stage1" in data
        assert "stage2" in data
        assert "stage3" in data
        assert "metadata" in data


def test_send_message_saves_assistant_message(client, mock_storage):
    """Test that assistant response is saved."""
    conv_id = "test-conv"
    
    mock_storage.get_conversation.return_value = {
        "id": conv_id,
        "messages": []
    }
    
    stage1 = [{"model": "m1", "response": "r1"}]
    stage2 = [{"model": "m1", "ranking": "rank"}]
    stage3 = {"model": "chairman", "response": "final"}
    
    with patch('backend.main.run_full_council') as mock_council:
        mock_council.return_value = (stage1, stage2, stage3, {})
        
        client.post(
            f"/api/conversations/{conv_id}/message",
            json={"content": "Test"}
        )
        
        mock_storage.add_assistant_message.assert_called_once_with(
            conv_id, stage1, stage2, stage3
        )


def test_send_message_nonexistent_conversation(client, mock_storage):
    """Test sending message to non-existent conversation returns 404."""
    mock_storage.get_conversation.return_value = None
    
    response = client.post(
        "/api/conversations/nonexistent/message",
        json={"content": "Test"}
    )
    
    assert response.status_code == 404


def test_send_message_returns_complete_response(client, mock_storage):
    """Test that send_message returns all stages and metadata."""
    conv_id = "test-conv"
    
    mock_storage.get_conversation.return_value = {
        "id": conv_id,
        "messages": []
    }
    
    stage1 = [{"model": "m1", "response": "response1"}]
    stage2 = [{"model": "m1", "ranking": "ranking1"}]
    stage3 = {"model": "chairman", "response": "final response"}
    metadata = {
        "label_to_model": {"Response A": "m1"},
        "aggregate_rankings": [{"model": "m1", "average_rank": 1.0}]
    }
    
    with patch('backend.main.run_full_council') as mock_council:
        mock_council.return_value = (stage1, stage2, stage3, metadata)
        
        response = client.post(
            f"/api/conversations/{conv_id}/message",
            json={"content": "Test question"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["stage1"] == stage1
        assert data["stage2"] == stage2
        assert data["stage3"] == stage3
        assert data["metadata"] == metadata


def test_send_message_validates_content_field(client, mock_storage):
    """Test that send_message requires content field."""
    conv_id = "test-conv"
    mock_storage.get_conversation.return_value = {"id": conv_id, "messages": []}
    
    # Send request without content field
    response = client.post(
        f"/api/conversations/{conv_id}/message",
        json={}
    )
    
    assert response.status_code == 422  # Validation error


def test_cors_middleware_configured(client):
    """Test that CORS middleware is properly configured."""
    # The middleware should be configured in the app
    # We can verify by checking the app's middleware
    from backend.main import app
    from fastapi.middleware.cors import CORSMiddleware
    
    cors_middleware = None
    for middleware in app.user_middleware:
        if middleware.cls == CORSMiddleware:
            cors_middleware = middleware
            break
    
    assert cors_middleware is not None


def test_pydantic_models_validation():
    """Test that Pydantic models validate correctly."""
    from backend.main import SendMessageRequest
    
    # Valid request
    valid_request = SendMessageRequest(content="Test message")
    assert valid_request.content == "Test message"
    
    # Test that empty content is allowed by the model itself
    # (validation should happen at the API level if needed)
    empty_request = SendMessageRequest(content="")
    assert empty_request.content == ""


def test_conversation_metadata_model():
    """Test ConversationMetadata Pydantic model."""
    from backend.main import ConversationMetadata
    
    metadata = ConversationMetadata(
        id="test-123",
        created_at="2025-01-01T00:00:00",
        title="Test",
        message_count=5
    )
    
    assert metadata.id == "test-123"
    assert metadata.message_count == 5


def test_conversation_model():
    """Test Conversation Pydantic model."""
    from backend.main import Conversation
    
    conv = Conversation(
        id="test-123",
        created_at="2025-01-01T00:00:00",
        title="Test",
        messages=[{"role": "user", "content": "Hello"}]
    )
    
    assert conv.id == "test-123"
    assert len(conv.messages) == 1


@pytest.mark.asyncio
async def test_send_message_stream_endpoint(client, mock_storage):
    """Test streaming message endpoint."""
    conv_id = "test-conv"
    
    mock_storage.get_conversation.return_value = {
        "id": conv_id,
        "messages": []
    }
    
    with patch('backend.main.stage1_collect_responses') as mock_s1, \
         patch('backend.main.stage2_collect_rankings') as mock_s2, \
         patch('backend.main.stage3_synthesize_final') as mock_s3, \
         patch('backend.main.generate_conversation_title') as mock_title:
        
        mock_s1.return_value = [{"model": "m1", "response": "r1"}]
        mock_s2.return_value = (
            [{"model": "m1", "ranking": "rank"}],
            {"Response A": "m1"}
        )
        mock_s3.return_value = {"model": "chairman", "response": "final"}
        mock_title.return_value = "Generated Title"
        
        response = client.post(
            f"/api/conversations/{conv_id}/message/stream",
            json={"content": "Test message"}
        )
        
        assert response.status_code == 200
        assert response.headers["content-type"] == "text/event-stream; charset=utf-8"


def test_send_message_stream_nonexistent_conversation(client, mock_storage):
    """Test streaming to non-existent conversation returns 404."""
    mock_storage.get_conversation.return_value = None
    
    response = client.post(
        "/api/conversations/nonexistent/message/stream",
        json={"content": "Test"}
    )
    
    assert response.status_code == 404