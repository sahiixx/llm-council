"""Pytest configuration and shared fixtures for backend tests."""

import pytest
import os
import tempfile
import shutil
from unittest.mock import AsyncMock, MagicMock


@pytest.fixture
def temp_dir():
    """Create a temporary directory for testing."""
    temp_path = tempfile.mkdtemp()
    yield temp_path
    shutil.rmtree(temp_path, ignore_errors=True)


@pytest.fixture
def mock_env_vars():
    """Mock environment variables."""
    original_env = os.environ.copy()
    
    # Set test environment variables
    os.environ["OPENROUTER_API_KEY"] = "test-api-key-12345"
    
    yield
    
    # Restore original environment
    os.environ.clear()
    os.environ.update(original_env)


@pytest.fixture
def sample_conversation():
    """Sample conversation data for testing."""
    return {
        "id": "conv-001",
        "created_at": "2024-01-15T10:30:00",
        "title": "Sample Conversation",
        "messages": [
            {
                "role": "user",
                "content": "What is machine learning?"
            },
            {
                "role": "assistant",
                "stage1": [
                    {"model": "openai/gpt-4", "response": "ML is a subset of AI..."},
                    {"model": "google/gemini-pro", "response": "Machine learning involves..."}
                ],
                "stage2": [
                    {"model": "openai/gpt-4", "ranking": "FINAL RANKING:\n1. Response B\n2. Response A"}
                ],
                "stage3": {
                    "model": "google/gemini-pro",
                    "response": "Machine learning is a field of AI..."
                }
            }
        ]
    }


@pytest.fixture
def sample_stage1_results():
    """Sample Stage 1 results for testing."""
    return [
        {"model": "openai/gpt-4", "response": "Response from GPT-4"},
        {"model": "google/gemini-pro", "response": "Response from Gemini"},
        {"model": "anthropic/claude", "response": "Response from Claude"}
    ]


@pytest.fixture
def sample_stage2_results():
    """Sample Stage 2 results for testing."""
    return [
        {
            "model": "openai/gpt-4",
            "ranking": "FINAL RANKING:\n1. Response B\n2. Response A\n3. Response C",
            "parsed_ranking": ["Response B", "Response A", "Response C"]
        },
        {
            "model": "google/gemini-pro",
            "ranking": "FINAL RANKING:\n1. Response A\n2. Response B\n3. Response C",
            "parsed_ranking": ["Response A", "Response B", "Response C"]
        }
    ]


@pytest.fixture
def sample_label_to_model():
    """Sample label-to-model mapping for testing."""
    return {
        "Response A": "openai/gpt-4",
        "Response B": "google/gemini-pro",
        "Response C": "anthropic/claude"
    }


@pytest.fixture
def mock_httpx_response():
    """Mock httpx response for API calls."""
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "choices": [
            {
                "message": {
                    "content": "This is a mock response",
                    "reasoning_details": None
                }
            }
        ]
    }
    return mock_response


@pytest.fixture
def mock_openrouter_success():
    """Mock successful OpenRouter API response."""
    return {
        "content": "This is a successful response from the model.",
        "reasoning_details": None
    }


@pytest.fixture
def mock_openrouter_with_reasoning():
    """Mock OpenRouter API response with reasoning details."""
    return {
        "content": "Response with reasoning",
        "reasoning_details": {
            "thinking": "Let me analyze this step by step...",
            "steps": ["Step 1", "Step 2", "Step 3"]
        }
    }


@pytest.fixture
async def mock_async_client():
    """Mock httpx AsyncClient."""
    mock_client = MagicMock()
    mock_client.post = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock()
    return mock_client


@pytest.fixture
def conversation_metadata_list():
    """List of conversation metadata for testing."""
    return [
        {
            "id": "conv-001",
            "created_at": "2024-01-15T10:30:00",
            "title": "First Conversation",
            "message_count": 4
        },
        {
            "id": "conv-002",
            "created_at": "2024-01-16T14:20:00",
            "title": "Second Conversation",
            "message_count": 2
        },
        {
            "id": "conv-003",
            "created_at": "2024-01-17T09:15:00",
            "title": "Third Conversation",
            "message_count": 6
        }
    ]


@pytest.fixture
def empty_conversation():
    """Empty conversation (no messages) for testing."""
    return {
        "id": "conv-empty",
        "created_at": "2024-01-20T12:00:00",
        "title": "New Conversation",
        "messages": []
    }


# Pytest configuration
def pytest_configure(config):
    """Configure pytest with custom markers."""
    config.addinivalue_line(
        "markers", "slow: marks tests as slow (deselect with '-m \"not slow\"')"
    )
    config.addinivalue_line(
        "markers", "integration: marks tests as integration tests"
    )
    config.addinivalue_line(
        "markers", "unit: marks tests as unit tests"
    )


# Auto-use fixture to ensure clean test environment
@pytest.fixture(autouse=True)
def reset_modules():
    """Reset imported modules between tests to avoid state leakage."""
    import sys
    
    # Store initial modules
    initial_modules = set(sys.modules.keys())
    
    yield
    
    # Clean up any test-specific modules
    # (Don't remove built-in or pytest modules)
    modules_to_remove = []
    for module_name in sys.modules.keys():
        if module_name not in initial_modules and not module_name.startswith('_pytest'):
            if 'backend' in module_name or 'test_' in module_name:
                modules_to_remove.append(module_name)
    
    for module_name in modules_to_remove:
        try:
            del sys.modules[module_name]
        except KeyError:
            pass
