/**
 * Comprehensive unit tests for Stage2.jsx
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Stage2 from '../Stage2';

describe('Stage2 Component', () => {
  const mockRankings = [
    { model: 'openai/gpt-4', ranking: 'FINAL RANKING:\n1. Response A\n2. Response B' },
    { model: 'anthropic/claude-3', ranking: 'FINAL RANKING:\n1. Response B\n2. Response A' },
  ];

  const mockLabelToModel = {
    'Response A': 'openai/gpt-4',
    'Response B': 'google/gemini-pro',
  };

  const mockAggregateRankings = [
    { model: 'openai/gpt-4', average_rank: 1.5, rankings_count: 2 },
    { model: 'google/gemini-pro', average_rank: 1.5, rankings_count: 2 },
  ];

  describe('Rendering', () => {
    it('should render stage title', () => {
      render(<Stage2 rankings={mockRankings} labelToModel={mockLabelToModel} />);
      expect(screen.getByText(/stage 2.*peer rankings/i)).toBeInTheDocument();
    });

    it('should return null for empty rankings', () => {
      const { container } = render(<Stage2 rankings={[]} />);
      expect(container.firstChild).toBeNull();
    });

    it('should render tabs for each ranking', () => {
      render(<Stage2 rankings={mockRankings} labelToModel={mockLabelToModel} />);
      expect(screen.getByText('gpt-4')).toBeInTheDocument();
      expect(screen.getByText('claude-3')).toBeInTheDocument();
    });

    it('should render aggregate rankings when provided', () => {
      render(<Stage2 rankings={mockRankings} labelToModel={mockLabelToModel} aggregateRankings={mockAggregateRankings} />);
      expect(screen.getByText(/aggregate rankings.*street cred/i)).toBeInTheDocument();
    });
  });

  describe('De-anonymization', () => {
    it('should replace Response labels with model names', () => {
      render(<Stage2 rankings={mockRankings} labelToModel={mockLabelToModel} />);
      // Should show bold model names instead of Response A/B
      expect(screen.getByText(/gpt-4/)).toBeInTheDocument();
    });

    it('should handle rankings without labelToModel', () => {
      expect(() => {
        render(<Stage2 rankings={mockRankings} />);
      }).not.toThrow();
    });
  });

  describe('Parsed Rankings', () => {
    it('should display parsed ranking when available', () => {
      const rankingsWithParsed = [
        {
          model: 'model1',
          ranking: 'Text',
          parsed_ranking: ['Response A', 'Response B'],
        },
      ];

      render(<Stage2 rankings={rankingsWithParsed} labelToModel={mockLabelToModel} />);
      expect(screen.getByText(/extracted ranking/i)).toBeInTheDocument();
    });

    it('should show model names in extracted ranking', () => {
      const rankingsWithParsed = [
        {
          model: 'model1',
          ranking: 'Text',
          parsed_ranking: ['Response A', 'Response B'],
        },
      ];

      render(<Stage2 rankings={rankingsWithParsed} labelToModel={mockLabelToModel} />);
      expect(screen.getByText('gpt-4')).toBeInTheDocument();
      expect(screen.getByText('gemini-pro')).toBeInTheDocument();
    });
  });

  describe('Aggregate Rankings Display', () => {
    it('should show aggregate rankings with scores', () => {
      render(<Stage2 rankings={mockRankings} labelToModel={mockLabelToModel} aggregateRankings={mockAggregateRankings} />);
      expect(screen.getByText(/avg: 1\.50/i)).toBeInTheDocument();
      expect(screen.getByText(/2 votes/i)).toBeInTheDocument();
    });

    it('should show rank positions', () => {
      render(<Stage2 rankings={mockRankings} labelToModel={mockLabelToModel} aggregateRankings={mockAggregateRankings} />);
      expect(screen.getByText('#1')).toBeInTheDocument();
      expect(screen.getByText('#2')).toBeInTheDocument();
    });

    it('should not show aggregate section when not provided', () => {
      render(<Stage2 rankings={mockRankings} labelToModel={mockLabelToModel} />);
      expect(screen.queryByText(/aggregate rankings/i)).not.toBeInTheDocument();
    });
  });

  describe('Tab Switching', () => {
    it('should switch between ranking tabs', async () => {
      const user = userEvent.setup();
      render(<Stage2 rankings={mockRankings} labelToModel={mockLabelToModel} />);

      const claudeTab = screen.getByText('claude-3');
      await user.click(claudeTab);

      expect(screen.getByText('anthropic/claude-3')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty aggregate rankings', () => {
      render(<Stage2 rankings={mockRankings} labelToModel={mockLabelToModel} aggregateRankings={[]} />);
      expect(screen.queryByText(/aggregate rankings/i)).not.toBeInTheDocument();
    });

    it('should handle single ranking', () => {
      const singleRanking = [mockRankings[0]];
      render(<Stage2 rankings={singleRanking} labelToModel={mockLabelToModel} />);
      expect(screen.getByText('openai/gpt-4')).toBeInTheDocument();
    });
  });
});