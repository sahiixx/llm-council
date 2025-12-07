"""Tests for backend/council.py module."""

import pytest
from unittest.mock import Mock, AsyncMock, patch
from backend import council


# Tests for parse_ranking_from_text
def test_parse_ranking_from_text_standard_format():
    """Test parsing ranking with standard FINAL RANKING format."""
    ranking_text = """
    Response A is good because...
    Response B is better because...
    
    FINAL RANKING:
    1. Response B
    2. Response A
    3. Response C
    """
    
    result = council.parse_ranking_from_text(ranking_text)
    
    assert result == ["Response B", "Response A", "Response C"]


def test_parse_ranking_from_text_no_spaces():
    """Test parsing ranking without spaces after numbers."""
    ranking_text = """
    FINAL RANKING:
    1.Response A
    2.Response B
    """
    
    result = council.parse_ranking_from_text(ranking_text)
    
    assert result == ["Response A", "Response B"]


def test_parse_ranking_from_text_with_extra_text():
    """Test parsing ranking with extra explanatory text."""
    ranking_text = """
    Analysis of responses...
    
    FINAL RANKING:
    1. Response C - This is the best
    2. Response A - This is second
    3. Response B - This is third
    """
    
    result = council.parse_ranking_from_text(ranking_text)
    
    # Should extract just the Response labels
    assert "Response C" in result
    assert "Response A" in result
    assert "Response B" in result


def test_parse_ranking_from_text_fallback_without_final_ranking():
    """Test fallback parsing when FINAL RANKING section is missing."""
    ranking_text = """
    I think Response A, Response B, and Response C in that order.
    """
    
    result = council.parse_ranking_from_text(ranking_text)
    
    assert result == ["Response A", "Response B", "Response C"]


def test_parse_ranking_from_text_empty_string():
    """Test parsing empty string."""
    result = council.parse_ranking_from_text("")
    assert result == []


def test_parse_ranking_from_text_no_response_labels():
    """Test parsing text with no Response labels."""
    ranking_text = "This is just some random text without rankings."
    result = council.parse_ranking_from_text(ranking_text)
    assert result == []


def test_parse_ranking_from_text_multiple_response_occurrences():
    """Test that only responses in FINAL RANKING section are parsed."""
    ranking_text = """
    Response A appeared earlier in the text.
    Response B was mentioned here.
    
    FINAL RANKING:
    1. Response C
    2. Response B
    3. Response A
    """
    
    result = council.parse_ranking_from_text(ranking_text)
    
    # Should only get responses from FINAL RANKING section
    assert result == ["Response C", "Response B", "Response A"]


# Tests for calculate_aggregate_rankings
def test_calculate_aggregate_rankings_simple_case():
    """Test aggregate ranking calculation with simple unanimous ranking."""
    stage2_results = [
        {
            "model": "model1",
            "ranking": "FINAL RANKING:\n1. Response A\n2. Response B",
            "parsed_ranking": ["Response A", "Response B"]
        },
        {
            "model": "model2",
            "ranking": "FINAL RANKING:\n1. Response A\n2. Response B",
            "parsed_ranking": ["Response A", "Response B"]
        }
    ]
    
    label_to_model = {
        "Response A": "openai/gpt-4",
        "Response B": "google/gemini"
    }
    
    result = council.calculate_aggregate_rankings(stage2_results, label_to_model)
    
    assert len(result) == 2
    assert result[0]["model"] == "openai/gpt-4"
    assert result[0]["average_rank"] == 1.0
    assert result[1]["model"] == "google/gemini"
    assert result[1]["average_rank"] == 2.0


def test_calculate_aggregate_rankings_mixed_rankings():
    """Test aggregate ranking with different model rankings."""
    stage2_results = [
        {
            "model": "model1",
            "ranking": "FINAL RANKING:\n1. Response A\n2. Response B\n3. Response C",
            "parsed_ranking": ["Response A", "Response B", "Response C"]
        },
        {
            "model": "model2",
            "ranking": "FINAL RANKING:\n1. Response B\n2. Response A\n3. Response C",
            "parsed_ranking": ["Response B", "Response A", "Response C"]
        }
    ]
    
    label_to_model = {
        "Response A": "model-a",
        "Response B": "model-b",
        "Response C": "model-c"
    }
    
    result = council.calculate_aggregate_rankings(stage2_results, label_to_model)
    
    # model-a: (1 + 2) / 2 = 1.5
    # model-b: (2 + 1) / 2 = 1.5
    # model-c: (3 + 3) / 2 = 3.0
    
    assert len(result) == 3
    # Both model-a and model-b should have avg 1.5
    top_two = result[:2]
    assert all(r["average_rank"] == 1.5 for r in top_two)
    assert result[2]["average_rank"] == 3.0


def test_calculate_aggregate_rankings_includes_count():
    """Test that aggregate rankings include rankings_count."""
    stage2_results = [
        {
            "model": "model1",
            "ranking": "FINAL RANKING:\n1. Response A",
            "parsed_ranking": ["Response A"]
        },
        {
            "model": "model2",
            "ranking": "FINAL RANKING:\n1. Response A",
            "parsed_ranking": ["Response A"]
        }
    ]
    
    label_to_model = {"Response A": "test-model"}
    
    result = council.calculate_aggregate_rankings(stage2_results, label_to_model)
    
    assert result[0]["rankings_count"] == 2


def test_calculate_aggregate_rankings_empty_results():
    """Test aggregate rankings with empty stage2 results."""
    result = council.calculate_aggregate_rankings([], {})
    assert result == []


def test_calculate_aggregate_rankings_handles_missing_labels():
    """Test that aggregate rankings handles labels not in mapping."""
    stage2_results = [
        {
            "model": "model1",
            "ranking": "FINAL RANKING:\n1. Response X\n2. Response A",
            "parsed_ranking": ["Response X", "Response A"]
        }
    ]
    
    label_to_model = {"Response A": "model-a"}
    
    result = council.calculate_aggregate_rankings(stage2_results, label_to_model)
    
    # Should only include Response A
    assert len(result) == 1
    assert result[0]["model"] == "model-a"


# Tests for stage1_collect_responses
@pytest.mark.asyncio
async def test_stage1_collect_responses_success(sample_stage1_results):
    """Test successful Stage 1 response collection."""
    user_query = "What is the capital of France?"
    
    async def mock_query_models(models, messages):
        return {
            "openai/gpt-5.1": {"content": "Paris is the capital."},
            "google/gemini-3-pro-preview": {"content": "The capital is Paris."},
            "anthropic/claude-sonnet-4.5": {"content": "France's capital is Paris."}
        }
    
    with patch('backend.council.query_models_parallel', side_effect=mock_query_models):
        result = await council.stage1_collect_responses(user_query)
        
        assert len(result) == 3
        assert all("model" in r and "response" in r for r in result)


@pytest.mark.asyncio
async def test_stage1_collect_responses_filters_none_responses():
    """Test that Stage 1 filters out None responses from failed models."""
    user_query = "Test query"
    
    async def mock_query_models(models, messages):
        return {
            "model1": {"content": "Response 1"},
            "model2": None,  # Failed
            "model3": {"content": "Response 3"}
        }
    
    with patch('backend.council.query_models_parallel', side_effect=mock_query_models):
        result = await council.stage1_collect_responses(user_query)
        
        assert len(result) == 2
        models = [r["model"] for r in result]
        assert "model1" in models
        assert "model3" in models
        assert "model2" not in models


@pytest.mark.asyncio
async def test_stage1_collect_responses_handles_empty_content():
    """Test that Stage 1 handles responses with empty content."""
    user_query = "Test query"
    
    async def mock_query_models(models, messages):
        return {
            "model1": {"content": ""},
            "model2": {"content": "Valid response"}
        }
    
    with patch('backend.council.query_models_parallel', side_effect=mock_query_models):
        result = await council.stage1_collect_responses(user_query)
        
        # Should include both, even with empty content
        assert len(result) == 2


# Tests for stage2_collect_rankings
@pytest.mark.asyncio
async def test_stage2_collect_rankings_creates_anonymous_labels(sample_stage1_results):
    """Test that Stage 2 creates anonymous labels for responses."""
    user_query = "Test query"
    
    async def mock_query_models(models, messages):
        return {
            "model1": {"content": "FINAL RANKING:\n1. Response A\n2. Response B"}
        }
    
    with patch('backend.council.query_models_parallel', side_effect=mock_query_models):
        results, label_to_model = await council.stage2_collect_rankings(
            user_query, sample_stage1_results
        )
        
        # Check label mapping
        assert "Response A" in label_to_model
        assert "Response B" in label_to_model
        assert "Response C" in label_to_model


@pytest.mark.asyncio
async def test_stage2_collect_rankings_builds_correct_prompt(sample_stage1_results):
    """Test that Stage 2 builds a ranking prompt with anonymized responses."""
    user_query = "Test query"
    
    captured_messages = []
    
    async def mock_query_models(models, messages):
        captured_messages.append(messages)
        return {"model1": {"content": "FINAL RANKING:\n1. Response A"}}
    
    with patch('backend.council.query_models_parallel', side_effect=mock_query_models):
        await council.stage2_collect_rankings(user_query, sample_stage1_results)
        
        # Check that prompt contains anonymized responses
        prompt = captured_messages[0][0]["content"]
        assert "Response A:" in prompt
        assert "Response B:" in prompt
        assert "Response C:" in prompt
        assert "FINAL RANKING:" in prompt


@pytest.mark.asyncio
async def test_stage2_collect_rankings_parses_rankings(sample_stage1_results):
    """Test that Stage 2 parses rankings from model responses."""
    user_query = "Test query"
    
    async def mock_query_models(models, messages):
        return {
            "model1": {"content": "Analysis...\n\nFINAL RANKING:\n1. Response A\n2. Response B"}
        }
    
    with patch('backend.council.query_models_parallel', side_effect=mock_query_models):
        results, _ = await council.stage2_collect_rankings(user_query, sample_stage1_results)
        
        assert len(results) == 1
        assert "parsed_ranking" in results[0]
        assert results[0]["parsed_ranking"] == ["Response A", "Response B"]


# Tests for stage3_synthesize_final
@pytest.mark.asyncio
async def test_stage3_synthesize_final_uses_chairman_model(
    sample_stage1_results, sample_stage2_results
):
    """Test that Stage 3 uses the configured chairman model."""
    from backend.config import CHAIRMAN_MODEL
    
    user_query = "Test query"
    
    captured_model = []
    
    async def mock_query_model(model, messages, timeout=120.0):
        captured_model.append(model)
        return {"content": "Final synthesis"}
    
    with patch('backend.council.query_model', side_effect=mock_query_model):
        result = await council.stage3_synthesize_final(
            user_query, sample_stage1_results, sample_stage2_results
        )
        
        assert captured_model[0] == CHAIRMAN_MODEL
        assert result["model"] == CHAIRMAN_MODEL


@pytest.mark.asyncio
async def test_stage3_synthesize_final_includes_all_context(
    sample_stage1_results, sample_stage2_results
):
    """Test that Stage 3 includes context from both previous stages."""
    user_query = "Test query"
    
    captured_messages = []
    
    async def mock_query_model(model, messages, timeout=120.0):
        captured_messages.append(messages)
        return {"content": "Final synthesis"}
    
    with patch('backend.council.query_model', side_effect=mock_query_model):
        await council.stage3_synthesize_final(
            user_query, sample_stage1_results, sample_stage2_results
        )
        
        prompt = captured_messages[0][0]["content"]
        assert "STAGE 1" in prompt
        assert "STAGE 2" in prompt
        assert user_query in prompt


@pytest.mark.asyncio
async def test_stage3_synthesize_final_handles_chairman_failure(
    sample_stage1_results, sample_stage2_results
):
    """Test that Stage 3 handles chairman model failure gracefully."""
    user_query = "Test query"
    
    async def mock_query_model(model, messages, timeout=120.0):
        return None  # Simulate failure
    
    with patch('backend.council.query_model', side_effect=mock_query_model):
        result = await council.stage3_synthesize_final(
            user_query, sample_stage1_results, sample_stage2_results
        )
        
        assert result is not None
        assert "Error" in result["response"]


# Tests for generate_conversation_title
@pytest.mark.asyncio
async def test_generate_conversation_title_creates_short_title():
    """Test that title generation creates a short title."""
    user_query = "What is the best way to learn Python programming for beginners?"
    
    async def mock_query_model(model, messages, timeout=30.0):
        return {"content": "Learning Python Basics"}
    
    with patch('backend.council.query_model', side_effect=mock_query_model):
        title = await council.generate_conversation_title(user_query)
        
        assert isinstance(title, str)
        assert len(title) > 0
        assert title == "Learning Python Basics"


@pytest.mark.asyncio
async def test_generate_conversation_title_strips_quotes():
    """Test that title generation removes quotes."""
    user_query = "Test question"
    
    async def mock_query_model(model, messages, timeout=30.0):
        return {"content": '"Test Title"'}
    
    with patch('backend.council.query_model', side_effect=mock_query_model):
        title = await council.generate_conversation_title(user_query)
        
        assert title == "Test Title"
        assert '"' not in title


@pytest.mark.asyncio
async def test_generate_conversation_title_truncates_long_titles():
    """Test that very long titles are truncated."""
    user_query = "Test question"
    long_title = "A" * 100
    
    async def mock_query_model(model, messages, timeout=30.0):
        return {"content": long_title}
    
    with patch('backend.council.query_model', side_effect=mock_query_model):
        title = await council.generate_conversation_title(user_query)
        
        assert len(title) <= 50
        assert title.endswith("...")


@pytest.mark.asyncio
async def test_generate_conversation_title_handles_failure():
    """Test that title generation falls back on failure."""
    user_query = "Test question"
    
    async def mock_query_model(model, messages, timeout=30.0):
        return None  # Simulate failure
    
    with patch('backend.council.query_model', side_effect=mock_query_model):
        title = await council.generate_conversation_title(user_query)
        
        assert title == "New Conversation"


# Tests for run_full_council
@pytest.mark.asyncio
async def test_run_full_council_completes_all_stages():
    """Test that run_full_council executes all three stages."""
    user_query = "Test query"
    
    with patch('backend.council.stage1_collect_responses') as mock_s1, \
         patch('backend.council.stage2_collect_rankings') as mock_s2, \
         patch('backend.council.stage3_synthesize_final') as mock_s3:
        
        mock_s1.return_value = [{"model": "m1", "response": "r1"}]
        mock_s2.return_value = ([{"model": "m1", "ranking": "rank"}], {"Response A": "m1"})
        mock_s3.return_value = {"model": "chairman", "response": "final"}
        
        stage1, stage2, stage3, metadata = await council.run_full_council(user_query)
        
        assert mock_s1.called
        assert mock_s2.called
        assert mock_s3.called
        assert "aggregate_rankings" in metadata
        assert "label_to_model" in metadata


@pytest.mark.asyncio
async def test_run_full_council_handles_no_stage1_responses():
    """Test that run_full_council handles case when all stage1 models fail."""
    user_query = "Test query"
    
    with patch('backend.council.stage1_collect_responses') as mock_s1:
        mock_s1.return_value = []  # No successful responses
        
        stage1, stage2, stage3, metadata = await council.run_full_council(user_query)
        
        assert stage1 == []
        assert stage2 == []
        assert "error" in stage3["model"]
        assert "Error" in stage3["response"] or "failed" in stage3["response"].lower()


@pytest.mark.asyncio
async def test_run_full_council_returns_complete_metadata():
    """Test that run_full_council returns complete metadata."""
    user_query = "Test query"
    
    with patch('backend.council.stage1_collect_responses') as mock_s1, \
         patch('backend.council.stage2_collect_rankings') as mock_s2, \
         patch('backend.council.stage3_synthesize_final') as mock_s3, \
         patch('backend.council.calculate_aggregate_rankings') as mock_agg:
        
        mock_s1.return_value = [{"model": "m1", "response": "r1"}]
        mock_s2.return_value = (
            [{"model": "m1", "ranking": "rank", "parsed_ranking": ["Response A"]}],
            {"Response A": "m1"}
        )
        mock_s3.return_value = {"model": "chairman", "response": "final"}
        mock_agg.return_value = [{"model": "m1", "average_rank": 1.0}]
        
        _, _, _, metadata = await council.run_full_council(user_query)
        
        assert "label_to_model" in metadata
        assert "aggregate_rankings" in metadata
        assert isinstance(metadata["label_to_model"], dict)
        assert isinstance(metadata["aggregate_rankings"], list)