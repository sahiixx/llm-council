"""Shared pytest fixtures and configuration for all tests."""

import pytest
import os
import tempfile
import shutil
from unittest.mock import patch


@pytest.fixture
def temp_dir():
    """Create a temporary directory that is cleaned up after the test."""
    temp_path = tempfile.mkdtemp()
    yield temp_path
    shutil.rmtree(temp_path, ignore_errors=True)


@pytest.fixture
def mock_env_vars():
    """Mock environment variables for testing."""
    with patch.dict(os.environ, {
        'OPENROUTER_API_KEY': 'test-api-key-12345',
    }, clear=False):
        yield


@pytest.fixture
def sample_conversation():
    """Return a sample conversation structure for testing."""
    return {
        "id": "test-conv-123",
        "created_at": "2024-01-01T12:00:00",
        "title": "Test Conversation",
        "messages": [
            {
                "role": "user",
                "content": "What is Python?"
            },
            {
                "role": "assistant",
                "stage1": [
                    {"model": "openai/gpt-4", "response": "Python is a programming language."},
                    {"model": "anthropic/claude-3", "response": "Python is a high-level language."}
                ],
                "stage2": [
                    {"model": "openai/gpt-4", "ranking": "FINAL RANKING:\n1. Response B\n2. Response A"},
                    {"model": "anthropic/claude-3", "ranking": "FINAL RANKING:\n1. Response A\n2. Response B"}
                ],
                "stage3": {
                    "model": "google/gemini-pro",
                    "response": "Python is a versatile programming language."
                }
            }
        ]
    }


@pytest.fixture
def sample_stage1_results():
    """Return sample Stage 1 results."""
    return [
        {"model": "openai/gpt-4", "response": "Response from GPT-4"},
        {"model": "anthropic/claude-3", "response": "Response from Claude"},
        {"model": "google/gemini-pro", "response": "Response from Gemini"}
    ]


@pytest.fixture
def sample_stage2_results():
    """Return sample Stage 2 results."""
    return [
        {
            "model": "openai/gpt-4",
            "ranking": "FINAL RANKING:\n1. Response B\n2. Response A\n3. Response C",
            "parsed_ranking": ["Response B", "Response A", "Response C"]
        },
        {
            "model": "anthropic/claude-3",
            "ranking": "FINAL RANKING:\n1. Response A\n2. Response C\n3. Response B",
            "parsed_ranking": ["Response A", "Response C", "Response B"]
        }
    ]


@pytest.fixture
def sample_label_to_model():
    """Return sample label-to-model mapping."""
    return {
        "Response A": "openai/gpt-4",
        "Response B": "anthropic/claude-3",
        "Response C": "google/gemini-pro"
    }


@pytest.fixture
def mock_httpx_response():
    """Create a mock httpx response."""
    from unittest.mock import MagicMock
    
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "choices": [
            {
                "message": {
                    "content": "Mock response content",
                    "reasoning_details": None
                }
            }
        ]
    }
    return mock_response


# Configure pytest-asyncio
def pytest_configure(config):
    """Configure pytest with custom markers."""
    config.addinivalue_line(
        "markers", "asyncio: mark test as an async test"
    )
    config.addinivalue_line(
        "markers", "slow: mark test as slow running"
    )
    config.addinivalue_line(
        "markers", "integration: mark test as an integration test"
    )
