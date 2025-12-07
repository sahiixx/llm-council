"""Pytest configuration and shared fixtures."""

import pytest
import tempfile
import shutil
from pathlib import Path
from unittest.mock import Mock, AsyncMock, patch


@pytest.fixture
def mock_env_vars(monkeypatch):
    """Mock environment variables for testing."""
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-api-key-12345")
    return {
        "OPENROUTER_API_KEY": "test-api-key-12345"
    }


@pytest.fixture
def temp_data_dir(monkeypatch):
    """Create a temporary data directory for testing."""
    temp_dir = tempfile.mkdtemp()
    monkeypatch.setattr("backend.config.DATA_DIR", temp_dir)
    yield temp_dir
    shutil.rmtree(temp_dir, ignore_errors=True)


@pytest.fixture
def sample_conversation():
    """Sample conversation data for testing."""
    return {
        "id": "test-conv-123",
        "created_at": "2025-01-01T00:00:00",
        "title": "Test Conversation",
        "messages": [
            {"role": "user", "content": "Hello"},
            {
                "role": "assistant",
                "stage1": [],
                "stage2": [],
                "stage3": {}
            }
        ]
    }


@pytest.fixture
def sample_messages():
    """Sample message list for API calls."""
    return [
        {"role": "user", "content": "What is the capital of France?"}
    ]


@pytest.fixture
def mock_openrouter_response():
    """Mock successful OpenRouter API response."""
    return {
        "choices": [
            {
                "message": {
                    "content": "The capital of France is Paris.",
                    "reasoning_details": None
                }
            }
        ]
    }


@pytest.fixture
def mock_httpx_client():
    """Mock httpx AsyncClient for API calls."""
    mock_client = AsyncMock()
    mock_response = Mock()
    mock_response.raise_for_status = Mock()
    mock_response.json = Mock()
    mock_client.post = AsyncMock(return_value=mock_response)
    return mock_client


@pytest.fixture
def sample_stage1_results():
    """Sample Stage 1 results."""
    return [
        {
            "model": "openai/gpt-5.1",
            "response": "Paris is the capital of France."
        },
        {
            "model": "google/gemini-3-pro-preview",
            "response": "The capital city of France is Paris."
        },
        {
            "model": "anthropic/claude-sonnet-4.5",
            "response": "France's capital is Paris, located in the north."
        }
    ]


@pytest.fixture
def sample_stage2_results():
    """Sample Stage 2 ranking results."""
    return [
        {
            "model": "openai/gpt-5.1",
            "ranking": "Response A is concise.\n\nFINAL RANKING:\n1. Response A\n2. Response B\n3. Response C",
            "parsed_ranking": ["Response A", "Response B", "Response C"]
        },
        {
            "model": "google/gemini-3-pro-preview",
            "ranking": "Response B is clear.\n\nFINAL RANKING:\n1. Response B\n2. Response A\n3. Response C",
            "parsed_ranking": ["Response B", "Response A", "Response C"]
        }
    ]


@pytest.fixture
def sample_label_to_model():
    """Sample label to model mapping."""
    return {
        "Response A": "openai/gpt-5.1",
        "Response B": "google/gemini-3-pro-preview",
        "Response C": "anthropic/claude-sonnet-4.5"
    }