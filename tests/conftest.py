"""Shared pytest fixtures for backend tests."""

import pytest
import tempfile
import shutil
from pathlib import Path
from unittest.mock import patch


@pytest.fixture
def temp_data_dir():
    """Create a temporary data directory for testing."""
    temp_dir = tempfile.mkdtemp()
    yield temp_dir
    shutil.rmtree(temp_dir, ignore_errors=True)


@pytest.fixture
def mock_data_dir(temp_data_dir):
    """Mock DATA_DIR to use temporary directory."""
    with patch("backend.storage.DATA_DIR", temp_data_dir):
        with patch("backend.config.DATA_DIR", temp_data_dir):
            yield temp_data_dir


@pytest.fixture
def mock_api_key():
    """Mock OpenRouter API key."""
    with patch("backend.config.OPENROUTER_API_KEY", "test-api-key-123"):
        with patch("backend.openrouter.OPENROUTER_API_KEY", "test-api-key-123"):
            yield "test-api-key-123"


@pytest.fixture
def sample_conversation():
    """Sample conversation data for testing."""
    return {
        "id": "test-conv-123",
        "created_at": "2024-01-01T00:00:00",
        "title": "Test Conversation",
        "messages": [
            {"role": "user", "content": "What is Python?"},
            {
                "role": "assistant",
                "stage1": [{"model": "m1", "response": "Python is a programming language"}],
                "stage2": [{"model": "m1", "ranking": "FINAL RANKING:\n1. Response A"}],
                "stage3": {"model": "chairman", "response": "Final answer about Python"}
            }
        ]
    }


@pytest.fixture
def empty_conversation():
    """Empty conversation for testing."""
    return {
        "id": "empty-conv-456",
        "created_at": "2024-01-02T00:00:00",
        "title": "New Conversation",
        "messages": []
    }
