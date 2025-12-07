/**
 * Comprehensive unit tests for frontend/src/components/Stage2.jsx
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Stage2 from './Stage2';

describe('Stage2 Component', () => {
  const mockRankings = [
    { model: 'openai/gpt-4', ranking: 'FINAL RANKING:\n1. Response A\n2. Response B' },
    { model: 'anthropic/claude-3', ranking: 'FINAL RANKING:\n1. Response B\n2. Response A' }
  ];

  const mockLabelToModel = {
    'Response A': 'openai/gpt-4',
    'Response B': 'anthropic/claude-3'
  };

  const mockAggregateRankings = [
    { model: 'openai/gpt-4', average_rank: 1.5, rankings_count: 2 },
    { model: 'anthropic/claude-3', average_rank: 1.5, rankings_count: 2 }
  ];

  describe('Rendering', () => {
    it('should render stage title', () => {
      render(<Stage2 rankings={mockRankings} />);
      expect(screen.getByText('Stage 2: Peer Rankings')).toBeInTheDocument();
    });

    it('should render description text', () => {
      render(<Stage2 rankings={mockRankings} />);
      expect(screen.getByText(/Each model evaluated all responses/)).toBeInTheDocument();
    });

    it('should render tabs for each ranking model', () => {
      render(<Stage2 rankings={mockRankings} />);
      
      expect(screen.getByText('gpt-4')).toBeInTheDocument();
      expect(screen.getByText('claude-3')).toBeInTheDocument();
    });

    it('should not render when rankings is null', () => {
      const { container } = render(<Stage2 rankings={null} />);
      expect(container.firstChild).toBeNull();
    });

    it('should not render when rankings is empty array', () => {
      const { container } = render(<Stage2 rankings={[]} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('De-anonymization', () => {
    it('should replace Response labels with model names', () => {
      render(
        <Stage2 
          rankings={mockRankings} 
          labelToModel={mockLabelToModel}
        />
      );
      
      // Should show model names in bold instead of Response A/B
      expect(screen.getByText(/gpt-4/)).toBeInTheDocument();
    });

    it('should handle rankings without labelToModel', () => {
      render(<Stage2 rankings={mockRankings} />);
      
      // Should still render without crashing
      expect(screen.getByText('Stage 2: Peer Rankings')).toBeInTheDocument();
    });
  });

  describe('Tab Interaction', () => {
    it('should display first ranking by default', () => {
      render(<Stage2 rankings={mockRankings} />);
      
      expect(screen.getByText('openai/gpt-4')).toBeInTheDocument();
    });

    it('should switch tabs when clicked', async () => {
      render(<Stage2 rankings={mockRankings} />);
      
      await userEvent.click(screen.getByText('claude-3'));
      
      expect(screen.getByText('anthropic/claude-3')).toBeInTheDocument();
    });

    it('should highlight active tab', async () => {
      const { container } = render(<Stage2 rankings={mockRankings} />);
      
      const tabs = container.querySelectorAll('.tab');
      expect(tabs[0]).toHaveClass('active');
      
      await userEvent.click(screen.getByText('claude-3'));
      
      expect(tabs[1]).toHaveClass('active');
    });
  });

  describe('Parsed Rankings', () => {
    it('should display extracted ranking when available', () => {
      const rankingsWithParsed = [
        {
          model: 'test/model',
          ranking: 'Some text',
          parsed_ranking: ['Response A', 'Response B']
        }
      ];
      
      render(
        <Stage2 
          rankings={rankingsWithParsed}
          labelToModel={mockLabelToModel}
        />
      );
      
      expect(screen.getByText('Extracted Ranking:')).toBeInTheDocument();
    });

    it('should show model names in extracted ranking', () => {
      const rankingsWithParsed = [
        {
          model: 'test/model',
          ranking: 'Some text',
          parsed_ranking: ['Response A', 'Response B']
        }
      ];
      
      render(
        <Stage2 
          rankings={rankingsWithParsed}
          labelToModel={mockLabelToModel}
        />
      );
      
      expect(screen.getByText('gpt-4')).toBeInTheDocument();
      expect(screen.getByText('claude-3')).toBeInTheDocument();
    });

    it('should not display extracted ranking when empty', () => {
      const rankingsWithoutParsed = [
        {
          model: 'test/model',
          ranking: 'Some text',
          parsed_ranking: []
        }
      ];
      
      render(<Stage2 rankings={rankingsWithoutParsed} />);
      
      expect(screen.queryByText('Extracted Ranking:')).not.toBeInTheDocument();
    });

    it('should handle missing parsed_ranking field', () => {
      const rankingsWithoutParsed = [
        {
          model: 'test/model',
          ranking: 'Some text'
        }
      ];
      
      render(<Stage2 rankings={rankingsWithoutParsed} />);
      
      expect(screen.queryByText('Extracted Ranking:')).not.toBeInTheDocument();
    });
  });

  describe('Aggregate Rankings', () => {
    it('should display aggregate rankings section when provided', () => {
      render(
        <Stage2 
          rankings={mockRankings}
          aggregateRankings={mockAggregateRankings}
        />
      );
      
      expect(screen.getByText('Aggregate Rankings (Street Cred)')).toBeInTheDocument();
    });

    it('should display average rank for each model', () => {
      render(
        <Stage2 
          rankings={mockRankings}
          aggregateRankings={mockAggregateRankings}
        />
      );
      
      expect(screen.getByText(/Avg: 1.50/)).toBeInTheDocument();
    });

    it('should display rankings count', () => {
      render(
        <Stage2 
          rankings={mockRankings}
          aggregateRankings={mockAggregateRankings}
        />
      );
      
      expect(screen.getByText(/\(2 votes\)/)).toBeInTheDocument();
    });

    it('should display rank position', () => {
      render(
        <Stage2 
          rankings={mockRankings}
          aggregateRankings={mockAggregateRankings}
        />
      );
      
      expect(screen.getByText('#1')).toBeInTheDocument();
      expect(screen.getByText('#2')).toBeInTheDocument();
    });

    it('should not display aggregate section when null', () => {
      render(
        <Stage2 
          rankings={mockRankings}
          aggregateRankings={null}
        />
      );
      
      expect(screen.queryByText('Aggregate Rankings')).not.toBeInTheDocument();
    });

    it('should not display aggregate section when empty', () => {
      render(
        <Stage2 
          rankings={mockRankings}
          aggregateRankings={[]}
        />
      );
      
      expect(screen.queryByText('Aggregate Rankings')).not.toBeInTheDocument();
    });

    it('should format average rank to 2 decimal places', () => {
      const aggregateWithDecimals = [
        { model: 'test/model', average_rank: 2.333333, rankings_count: 3 }
      ];
      
      render(
        <Stage2 
          rankings={mockRankings}
          aggregateRankings={aggregateWithDecimals}
        />
      );
      
      expect(screen.getByText(/Avg: 2.33/)).toBeInTheDocument();
    });

    it('should display short model names in aggregate list', () => {
      render(
        <Stage2 
          rankings={mockRankings}
          aggregateRankings={mockAggregateRankings}
        />
      );
      
      // Should show short names, not full paths
      const aggregateSection = screen.getByText('Aggregate Rankings (Street Cred)').parentElement;
      expect(aggregateSection?.textContent).toContain('gpt-4');
      expect(aggregateSection?.textContent).toContain('claude-3');
    });
  });

  describe('Edge Cases', () => {
    it('should handle single ranking', () => {
      const singleRanking = [
        { model: 'test/model', ranking: 'Single ranking' }
      ];
      
      render(<Stage2 rankings={singleRanking} />);
      
      expect(screen.getByText('test/model')).toBeInTheDocument();
    });

    it('should handle very long ranking text', () => {
      const longRanking = 'A'.repeat(10000);
      const longRankings = [
        { model: 'test/model', ranking: longRanking }
      ];
      
      render(<Stage2 rankings={longRankings} />);
      
      expect(screen.getByText(longRanking)).toBeInTheDocument();
    });

    it('should handle ranking with markdown', () => {
      const markdownRankings = [
        { model: 'test/model', ranking: '# Ranking\n\n**Bold text**' }
      ];
      
      render(<Stage2 rankings={markdownRankings} />);
      
      expect(screen.getByText(/Ranking/)).toBeInTheDocument();
    });

    it('should handle empty ranking text', () => {
      const emptyRankings = [
        { model: 'test/model', ranking: '' }
      ];
      
      render(<Stage2 rankings={emptyRankings} />);
      
      expect(screen.getByText('test/model')).toBeInTheDocument();
    });

    it('should handle model names without slash', () => {
      const noSlashRankings = [
        { model: 'simple-model', ranking: 'Ranking text' }
      ];
      
      render(<Stage2 rankings={noSlashRankings} />);
      
      expect(screen.getByText('simple-model')).toBeInTheDocument();
    });

    it('should handle special characters in ranking text', () => {
      const specialRankings = [
        { model: 'test/model', ranking: 'Test <>&"\' 你好 🌍' }
      ];
      
      render(<Stage2 rankings={specialRankings} />);
      
      expect(screen.getByText(/Test.*你好.*🌍/)).toBeInTheDocument();
    });
  });
});