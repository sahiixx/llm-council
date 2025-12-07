"""Comprehensive unit tests for backend/council.py."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from backend.council import (
    stage1_collect_responses,
    stage2_collect_rankings,
    stage3_synthesize_final,
    parse_ranking_from_text,
    calculate_aggregate_rankings,
    generate_conversation_title,
    run_full_council,
)


class TestStage1CollectResponses:
    """Tests for stage1_collect_responses function."""

    @pytest.mark.asyncio
    async def test_stage1_success_all_models(self):
        """Test Stage 1 with all models responding successfully."""
        mock_responses = {
            "model1": {"content": "Response from model 1"},
            "model2": {"content": "Response from model 2"},
            "model3": {"content": "Response from model 3"},
        }
        
        with patch("backend.council.query_models_parallel", new_callable=AsyncMock) as mock_query:
            mock_query.return_value = mock_responses
            
            with patch("backend.council.COUNCIL_MODELS", ["model1", "model2", "model3"]):
                result = await stage1_collect_responses("Test question?")
        
        assert len(result) == 3
        assert all(isinstance(r, dict) for r in result)
        assert all("model" in r and "response" in r for r in result)

    @pytest.mark.asyncio
    async def test_stage1_partial_failure(self):
        """Test Stage 1 when some models fail to respond."""
        mock_responses = {
            "model1": {"content": "Response from model 1"},
            "model2": None,  # Failed model
            "model3": {"content": "Response from model 3"},
        }
        
        with patch("backend.council.query_models_parallel", new_callable=AsyncMock) as mock_query:
            mock_query.return_value = mock_responses
            
            with patch("backend.council.COUNCIL_MODELS", ["model1", "model2", "model3"]):
                result = await stage1_collect_responses("Test question?")
        
        # Should only include successful responses
        assert len(result) == 2
        assert all(r["response"] for r in result)

    @pytest.mark.asyncio
    async def test_stage1_all_failures(self):
        """Test Stage 1 when all models fail."""
        mock_responses = {
            "model1": None,
            "model2": None,
        }
        
        with patch("backend.council.query_models_parallel", new_callable=AsyncMock) as mock_query:
            mock_query.return_value = mock_responses
            
            with patch("backend.council.COUNCIL_MODELS", ["model1", "model2"]):
                result = await stage1_collect_responses("Test question?")
        
        assert result == []

    @pytest.mark.asyncio
    async def test_stage1_empty_content(self):
        """Test Stage 1 with empty content responses."""
        mock_responses = {
            "model1": {"content": ""},
            "model2": {"content": "Valid response"},
        }
        
        with patch("backend.council.query_models_parallel", new_callable=AsyncMock) as mock_query:
            mock_query.return_value = mock_responses
            
            with patch("backend.council.COUNCIL_MODELS", ["model1", "model2"]):
                result = await stage1_collect_responses("Test question?")
        
        assert len(result) == 2  # Both are included even with empty content


class TestStage2CollectRankings:
    """Tests for stage2_collect_rankings function."""

    @pytest.mark.asyncio
    async def test_stage2_success(self):
        """Test Stage 2 with successful rankings."""
        stage1_results = [
            {"model": "model1", "response": "Response 1"},
            {"model": "model2", "response": "Response 2"},
            {"model": "model3", "response": "Response 3"},
        ]
        
        mock_responses = {
            "model1": {"content": "FINAL RANKING:\n1. Response B\n2. Response A\n3. Response C"},
            "model2": {"content": "FINAL RANKING:\n1. Response A\n2. Response C\n3. Response B"},
        }
        
        with patch("backend.council.query_models_parallel", new_callable=AsyncMock) as mock_query:
            mock_query.return_value = mock_responses
            
            with patch("backend.council.COUNCIL_MODELS", ["model1", "model2"]):
                rankings, label_to_model = await stage2_collect_rankings("Question?", stage1_results)
        
        assert len(rankings) == 2
        assert "Response A" in label_to_model
        assert "Response B" in label_to_model
        assert "Response C" in label_to_model
        assert label_to_model["Response A"] == "model1"

    @pytest.mark.asyncio
    async def test_stage2_label_generation(self):
        """Test correct label generation for anonymization."""
        stage1_results = [
            {"model": "model1", "response": "R1"},
            {"model": "model2", "response": "R2"},
        ]
        
        mock_responses = {
            "model1": {"content": "FINAL RANKING:\n1. Response A\n2. Response B"},
        }
        
        with patch("backend.council.query_models_parallel", new_callable=AsyncMock) as mock_query:
            mock_query.return_value = mock_responses
            
            with patch("backend.council.COUNCIL_MODELS", ["model1"]):
                rankings, label_to_model = await stage2_collect_rankings("Q", stage1_results)
        
        assert "Response A" in label_to_model
        assert "Response B" in label_to_model

    @pytest.mark.asyncio
    async def test_stage2_many_responses(self):
        """Test Stage 2 with many responses (testing alphabet labels)."""
        stage1_results = [{"model": f"model{i}", "response": f"R{i}"} for i in range(10)]
        
        mock_responses = {"model1": {"content": "Some ranking"}}
        
        with patch("backend.council.query_models_parallel", new_callable=AsyncMock) as mock_query:
            mock_query.return_value = mock_responses
            
            with patch("backend.council.COUNCIL_MODELS", ["model1"]):
                rankings, label_to_model = await stage2_collect_rankings("Q", stage1_results)
        
        # Should have labels A through J
        assert len(label_to_model) == 10
        assert "Response A" in label_to_model
        assert "Response J" in label_to_model


class TestStage3SynthesizeFinal:
    """Tests for stage3_synthesize_final function."""

    @pytest.mark.asyncio
    async def test_stage3_success(self):
        """Test Stage 3 with successful synthesis."""
        stage1_results = [{"model": "model1", "response": "R1"}]
        stage2_results = [{"model": "model1", "ranking": "Ranking 1"}]
        
        mock_response = {"content": "Final synthesized answer"}
        
        with patch("backend.council.query_model", new_callable=AsyncMock) as mock_query:
            mock_query.return_value = mock_response
            
            with patch("backend.council.CHAIRMAN_MODEL", "chairman"):
                result = await stage3_synthesize_final("Q", stage1_results, stage2_results)
        
        assert result["model"] == "chairman"
        assert result["response"] == "Final synthesized answer"

    @pytest.mark.asyncio
    async def test_stage3_chairman_failure(self):
        """Test Stage 3 when chairman model fails."""
        stage1_results = [{"model": "model1", "response": "R1"}]
        stage2_results = [{"model": "model1", "ranking": "Ranking 1"}]
        
        with patch("backend.council.query_model", new_callable=AsyncMock) as mock_query:
            mock_query.return_value = None
            
            with patch("backend.council.CHAIRMAN_MODEL", "chairman"):
                result = await stage3_synthesize_final("Q", stage1_results, stage2_results)
        
        assert result["model"] == "chairman"
        assert "Error" in result["response"]

    @pytest.mark.asyncio
    async def test_stage3_empty_stages(self):
        """Test Stage 3 with empty previous stage results."""
        stage1_results = []
        stage2_results = []
        
        mock_response = {"content": "Synthesized from empty"}
        
        with patch("backend.council.query_model", new_callable=AsyncMock) as mock_query:
            mock_query.return_value = mock_response
            
            result = await stage3_synthesize_final("Q", stage1_results, stage2_results)
        
        assert "response" in result


class TestParseRankingFromText:
    """Tests for parse_ranking_from_text function."""

    def test_parse_valid_ranking(self):
        """Test parsing valid FINAL RANKING section."""
        text = """
        Some preamble text.
        
        FINAL RANKING:
        1. Response B
        2. Response A
        3. Response C
        """
        result = parse_ranking_from_text(text)
        assert result == ["Response B", "Response A", "Response C"]

    def test_parse_ranking_without_spaces(self):
        """Test parsing ranking without spaces after numbers."""
        text = "FINAL RANKING:\n1.Response A\n2.Response B"
        result = parse_ranking_from_text(text)
        assert "Response A" in result
        assert "Response B" in result

    def test_parse_ranking_mixed_format(self):
        """Test parsing with mixed formatting."""
        text = """
        FINAL RANKING:
        1. Response C is best
        2. Response A comes next
        3. Response B is last
        """
        result = parse_ranking_from_text(text)
        assert "Response C" in result
        assert "Response A" in result
        assert "Response B" in result

    def test_parse_no_final_ranking_section(self):
        """Test parsing when FINAL RANKING section is missing."""
        text = "Response A is good. Response B is better."
        result = parse_ranking_from_text(text)
        # Should fallback to finding any Response X patterns
        assert "Response A" in result
        assert "Response B" in result

    def test_parse_empty_text(self):
        """Test parsing empty text."""
        result = parse_ranking_from_text("")
        assert result == []

    def test_parse_no_responses(self):
        """Test parsing text without any Response labels."""
        text = "FINAL RANKING:\n1. First place\n2. Second place"
        result = parse_ranking_from_text(text)
        assert result == []

    def test_parse_duplicate_responses(self):
        """Test parsing with duplicate response mentions."""
        text = "Response A Response A FINAL RANKING:\n1. Response A"
        result = parse_ranking_from_text(text)
        assert result == ["Response A"]


class TestCalculateAggregateRankings:
    """Tests for calculate_aggregate_rankings function."""

    def test_aggregate_basic(self):
        """Test basic aggregate ranking calculation."""
        stage2_results = [
            {"model": "m1", "ranking": "FINAL RANKING:\n1. Response A\n2. Response B"},
            {"model": "m2", "ranking": "FINAL RANKING:\n1. Response B\n2. Response A"},
        ]
        label_to_model = {
            "Response A": "model1",
            "Response B": "model2",
        }
        
        result = calculate_aggregate_rankings(stage2_results, label_to_model)
        
        assert len(result) == 2
        assert all("model" in r and "average_rank" in r for r in result)
        # Both should have average rank of 1.5 ((1+2)/2)
        assert result[0]["average_rank"] == 1.5
        assert result[1]["average_rank"] == 1.5

    def test_aggregate_clear_winner(self):
        """Test aggregate with a clear winner."""
        stage2_results = [
            {"model": "m1", "ranking": "FINAL RANKING:\n1. Response A\n2. Response B\n3. Response C"},
            {"model": "m2", "ranking": "FINAL RANKING:\n1. Response A\n2. Response C\n3. Response B"},
            {"model": "m3", "ranking": "FINAL RANKING:\n1. Response A\n2. Response B\n3. Response C"},
        ]
        label_to_model = {
            "Response A": "modelA",
            "Response B": "modelB",
            "Response C": "modelC",
        }
        
        result = calculate_aggregate_rankings(stage2_results, label_to_model)
        
        # Response A should be first (all ranked it #1)
        assert result[0]["model"] == "modelA"
        assert result[0]["average_rank"] == 1.0

    def test_aggregate_empty_rankings(self):
        """Test aggregate with empty rankings."""
        stage2_results = []
        label_to_model = {}
        
        result = calculate_aggregate_rankings(stage2_results, label_to_model)
        assert result == []

    def test_aggregate_partial_rankings(self):
        """Test when not all models rank all responses."""
        stage2_results = [
            {"model": "m1", "ranking": "FINAL RANKING:\n1. Response A"},
            {"model": "m2", "ranking": "FINAL RANKING:\n1. Response B\n2. Response A"},
        ]
        label_to_model = {
            "Response A": "modelA",
            "Response B": "modelB",
        }
        
        result = calculate_aggregate_rankings(stage2_results, label_to_model)
        
        assert len(result) == 2
        assert all("rankings_count" in r for r in result)

    def test_aggregate_sorting(self):
        """Test that results are sorted by average rank."""
        stage2_results = [
            {"model": "m1", "ranking": "FINAL RANKING:\n1. Response C\n2. Response B\n3. Response A"},
        ]
        label_to_model = {
            "Response A": "modelA",
            "Response B": "modelB",
            "Response C": "modelC",
        }
        
        result = calculate_aggregate_rankings(stage2_results, label_to_model)
        
        # Should be sorted: C (1.0), B (2.0), A (3.0)
        assert result[0]["model"] == "modelC"
        assert result[1]["model"] == "modelB"
        assert result[2]["model"] == "modelA"


class TestGenerateConversationTitle:
    """Tests for generate_conversation_title function."""

    @pytest.mark.asyncio
    async def test_title_generation_success(self):
        """Test successful title generation."""
        mock_response = {"content": "Quick Question About Python"}
        
        with patch("backend.council.query_model", new_callable=AsyncMock) as mock_query:
            mock_query.return_value = mock_response
            
            result = await generate_conversation_title("How do I use Python decorators?")
        
        assert result == "Quick Question About Python"

    @pytest.mark.asyncio
    async def test_title_generation_failure(self):
        """Test title generation when model fails."""
        with patch("backend.council.query_model", new_callable=AsyncMock) as mock_query:
            mock_query.return_value = None
            
            result = await generate_conversation_title("Test question")
        
        assert result == "New Conversation"

    @pytest.mark.asyncio
    async def test_title_with_quotes(self):
        """Test title generation removes quotes."""
        mock_response = {"content": '"Python Decorators"'}
        
        with patch("backend.council.query_model", new_callable=AsyncMock) as mock_query:
            mock_query.return_value = mock_response
            
            result = await generate_conversation_title("Question")
        
        assert result == "Python Decorators"
        assert '"' not in result

    @pytest.mark.asyncio
    async def test_title_truncation(self):
        """Test that very long titles are truncated."""
        long_title = "A" * 100
        mock_response = {"content": long_title}
        
        with patch("backend.council.query_model", new_callable=AsyncMock) as mock_query:
            mock_query.return_value = mock_response
            
            result = await generate_conversation_title("Question")
        
        assert len(result) <= 50
        assert result.endswith("...")

    @pytest.mark.asyncio
    async def test_title_empty_response(self):
        """Test title generation with empty response."""
        mock_response = {"content": ""}
        
        with patch("backend.council.query_model", new_callable=AsyncMock) as mock_query:
            mock_query.return_value = mock_response
            
            result = await generate_conversation_title("Question")
        
        assert result == "New Conversation"


class TestRunFullCouncil:
    """Tests for run_full_council function."""

    @pytest.mark.asyncio
    async def test_full_council_success(self):
        """Test complete council process with all stages."""
        stage1_mock = [{"model": "m1", "response": "R1"}]
        stage2_mock = [{"model": "m1", "ranking": "FINAL RANKING:\n1. Response A"}]
        stage3_mock = {"model": "chairman", "response": "Final answer"}
        label_mock = {"Response A": "m1"}
        
        with patch("backend.council.stage1_collect_responses", new_callable=AsyncMock) as s1:
            with patch("backend.council.stage2_collect_rankings", new_callable=AsyncMock) as s2:
                with patch("backend.council.stage3_synthesize_final", new_callable=AsyncMock) as s3:
                    s1.return_value = stage1_mock
                    s2.return_value = (stage2_mock, label_mock)
                    s3.return_value = stage3_mock
                    
                    s1_result, s2_result, s3_result, metadata = await run_full_council("Question?")
        
        assert s1_result == stage1_mock
        assert s2_result == stage2_mock
        assert s3_result == stage3_mock
        assert "label_to_model" in metadata
        assert "aggregate_rankings" in metadata

    @pytest.mark.asyncio
    async def test_full_council_stage1_failure(self):
        """Test full council when Stage 1 fails completely."""
        with patch("backend.council.stage1_collect_responses", new_callable=AsyncMock) as s1:
            s1.return_value = []
            
            s1_result, s2_result, s3_result, metadata = await run_full_council("Question?")
        
        assert s1_result == []
        assert s2_result == []
        assert "error" in s3_result.get("model", "")

    @pytest.mark.asyncio
    async def test_full_council_metadata_structure(self):
        """Test that metadata has correct structure."""
        stage1_mock = [{"model": "m1", "response": "R1"}]
        stage2_mock = [{"model": "m1", "ranking": "FINAL RANKING:\n1. Response A"}]
        stage3_mock = {"model": "chairman", "response": "Final"}
        label_mock = {"Response A": "m1"}
        
        with patch("backend.council.stage1_collect_responses", new_callable=AsyncMock) as s1:
            with patch("backend.council.stage2_collect_rankings", new_callable=AsyncMock) as s2:
                with patch("backend.council.stage3_synthesize_final", new_callable=AsyncMock) as s3:
                    s1.return_value = stage1_mock
                    s2.return_value = (stage2_mock, label_mock)
                    s3.return_value = stage3_mock
                    
                    _, _, _, metadata = await run_full_council("Q")
        
        assert isinstance(metadata, dict)
        assert "label_to_model" in metadata
        assert "aggregate_rankings" in metadata
        assert isinstance(metadata["aggregate_rankings"], list)


class TestEdgeCases:
    """Edge case tests."""

    @pytest.mark.asyncio
    async def test_unicode_in_query(self):
        """Test handling of Unicode characters in queries."""
        unicode_query = "What is the meaning of 你好 and café?"
        
        with patch("backend.council.query_models_parallel", new_callable=AsyncMock) as mock:
            mock.return_value = {"m1": {"content": "Response"}}
            with patch("backend.council.COUNCIL_MODELS", ["m1"]):
                result = await stage1_collect_responses(unicode_query)
        
        assert len(result) == 1

    @pytest.mark.asyncio
    async def test_very_long_query(self):
        """Test handling of very long queries."""
        long_query = "A" * 10000
        
        with patch("backend.council.query_models_parallel", new_callable=AsyncMock) as mock:
            mock.return_value = {"m1": {"content": "Response"}}
            with patch("backend.council.COUNCIL_MODELS", ["m1"]):
                result = await stage1_collect_responses(long_query)
        
        assert len(result) == 1

    def test_parse_ranking_case_sensitivity(self):
        """Test that ranking parsing handles case variations."""
        text = "FINAL RANKING:\n1. response A\n2. Response B"
        result = parse_ranking_from_text(text)
        # Should only match proper case "Response B"
        assert "Response B" in result

    @pytest.mark.asyncio
    async def test_concurrent_council_runs(self):
        """Test that multiple concurrent council runs don't interfere."""
        import asyncio
        
        with patch("backend.council.stage1_collect_responses", new_callable=AsyncMock) as s1:
            with patch("backend.council.stage2_collect_rankings", new_callable=AsyncMock) as s2:
                with patch("backend.council.stage3_synthesize_final", new_callable=AsyncMock) as s3:
                    s1.return_value = [{"model": "m1", "response": "R"}]
                    s2.return_value = ([{"model": "m1", "ranking": "R"}], {"Response A": "m1"})
                    s3.return_value = {"model": "c", "response": "F"}
                    
                    # Run multiple councils concurrently
                    results = await asyncio.gather(
                        run_full_council("Q1"),
                        run_full_council("Q2"),
                        run_full_council("Q3"),
                    )
        
        assert len(results) == 3
        assert all(len(r) == 4 for r in results)