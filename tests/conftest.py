"""Pytest configuration and shared fixtures."""

import pytest
import tempfile
import shutil
import os
from pathlib import Path
from unittest.mock import Mock, AsyncMock, patch


@pytest.fixture
def temp_data_dir(monkeypatch):
    """Create a temporary data directory for testing."""
    temp_dir = tempfile.mkdtemp()
    monkeypatch.setenv("DATA_DIR", temp_dir)
    # Also patch the config module
    with patch("backend.config.DATA_DIR", temp_dir):
        yield temp_dir
    shutil.rmtree(temp_dir, ignore_errors=True)


@pytest.fixture
def mock_openrouter_api_key(monkeypatch):
    """Mock the OpenRouter API key."""
    test_key = "test_api_key_12345"
    monkeypatch.setenv("OPENROUTER_API_KEY", test_key)
    with patch("backend.config.OPENROUTER_API_KEY", test_key):
        yield test_key


@pytest.fixture
def sample_user_query():
    """Sample user query for testing."""
    return "What is the capital of France?"


@pytest.fixture
def sample_stage1_results():
    """Sample Stage 1 results."""
    return [
        {
            "model": "openai/gpt-5.1",
            "response": "The capital of France is Paris. It's known for the Eiffel Tower."
        },
        {
            "model": "google/gemini-3-pro-preview",
            "response": "Paris is the capital of France. It's a major European city."
        },
        {
            "model": "anthropic/claude-sonnet-4.5",
            "response": "The capital city of France is Paris, established in the 3rd century BC."
        }
    ]


@pytest.fixture
def sample_stage2_results():
    """Sample Stage 2 results with rankings."""
    return [
        {
            "model": "openai/gpt-5.1",
            "ranking": "Response C provides the most comprehensive historical context.\n\nFINAL RANKING:\n1. Response C\n2. Response A\n3. Response B",
            "parsed_ranking": ["Response C", "Response A", "Response B"]
        },
        {
            "model": "google/gemini-3-pro-preview",
            "ranking": "All responses are correct. Response A is most detailed.\n\nFINAL RANKING:\n1. Response A\n2. Response C\n3. Response B",
            "parsed_ranking": ["Response A", "Response C", "Response B"]
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


@pytest.fixture
def mock_httpx_client():
    """Mock httpx AsyncClient."""
    mock_client = AsyncMock()
    mock_response = Mock()
    mock_response.json.return_value = {
        "choices": [{
            "message": {
                "content": "Test response content",
                "reasoning_details": None
            }
        }]
    }
    mock_response.raise_for_status = Mock()
    mock_client.post.return_value = mock_response
    return mock_client