"""Pytest configuration and shared fixtures for backend tests."""

import pytest
import tempfile
import shutil
import os
from unittest.mock import AsyncMock, MagicMock
from fastapi.testclient import TestClient


@pytest.fixture
def temp_data_dir():
    """Create a temporary data directory for testing."""
    temp_dir = tempfile.mkdtemp()
    yield temp_dir
    shutil.rmtree(temp_dir, ignore_errors=True)


@pytest.fixture
def mock_data_dir(temp_data_dir, monkeypatch):
    """Mock DATA_DIR to use temporary directory."""
    monkeypatch.setattr("backend.storage.DATA_DIR", temp_data_dir)
    yield temp_data_dir


@pytest.fixture
def mock_council_responses():
    """Mock responses for council stages."""
    return {
        "stage1": [
            {"model": "model1", "response": "Response 1"},
            {"model": "model2", "response": "Response 2"},
        ],
        "stage2": [
            {"model": "model1", "ranking": "FINAL RANKING:\n1. Response A\n2. Response B"},
            {"model": "model2", "ranking": "FINAL RANKING:\n1. Response B\n2. Response A"},
        ],
        "stage3": {"model": "chairman", "response": "Final synthesized answer"},
        "metadata": {
            "label_to_model": {"Response A": "model1", "Response B": "model2"},
            "aggregate_rankings": [
                {"model": "model1", "average_rank": 1.5, "rankings_count": 2},
                {"model": "model2", "average_rank": 1.5, "rankings_count": 2},
            ],
        },
    }


@pytest.fixture
def mock_run_full_council(mock_council_responses):
    """Mock run_full_council function."""
    async def _mock_council(query):
        return (
            mock_council_responses["stage1"],
            mock_council_responses["stage2"],
            mock_council_responses["stage3"],
            mock_council_responses["metadata"],
        )
    return _mock_council


@pytest.fixture
def mock_generate_title():
    """Mock generate_conversation_title function."""
    async def _mock_title(query):
        return "Test Conversation Title"
    return _mock_title


@pytest.fixture
def sample_conversation():
    """Sample conversation data for testing."""
    return {
        "id": "test-123",
        "created_at": "2024-01-01T00:00:00",
        "title": "Test Conversation",
        "messages": [
            {"role": "user", "content": "Hello"},
            {
                "role": "assistant",
                "stage1": [{"model": "m1", "response": "Hi"}],
                "stage2": [{"model": "m1", "ranking": "Ranking"}],
                "stage3": {"model": "chairman", "response": "Final"},
            },
        ],
    }


@pytest.fixture
def sample_conversation_list():
    """Sample conversation list for testing."""
    return [
        {
            "id": "conv-1",
            "created_at": "2024-01-01T00:00:00",
            "title": "Conversation 1",
            "message_count": 2,
        },
        {
            "id": "conv-2",
            "created_at": "2024-01-02T00:00:00",
            "title": "Conversation 2",
            "message_count": 4,
        },
    ]
