import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Stage2 from '../components/Stage2';

describe('Stage2 Component', () => {
  const mockRankings = [
    {
      model: 'openai/gpt-4',
      ranking: 'Response A is excellent.\n\nFINAL RANKING:\n1. Response A\n2. Response B\n3. Response C',
      parsed_ranking: ['Response A', 'Response B', 'Response C'],
    },
    {
      model: 'google/gemini-pro',
      ranking: 'Response B is best.\n\nFINAL RANKING:\n1. Response B\n2. Response A\n3. Response C',
      parsed_ranking: ['Response B', 'Response A', 'Response C'],
    },
  ];

  const mockLabelToModel = {
    'Response A': 'openai/gpt-4',
    'Response B': 'google/gemini-pro',
    'Response C': 'anthropic/claude',
  };

  const mockAggregateRankings = [
    { model: 'google/gemini-pro', average_rank: 1.5, rankings_count: 2 },
    { model: 'openai/gpt-4', average_rank: 2.0, rankings_count: 2 },
    { model: 'anthropic/claude', average_rank: 3.0, rankings_count: 2 },
  ];

  describe('Rendering', () => {
    it('renders stage title', () => {
      render(
        <Stage2
          rankings={mockRankings}
          labelToModel={mockLabelToModel}
          aggregateRankings={mockAggregateRankings}
        />
      );
      
      expect(screen.getByText('Stage 2: Peer Rankings')).toBeInTheDocument();
    });

    it('returns null when no rankings', () => {
      const { container } = render(<Stage2 rankings={[]} />);
      
      expect(container.firstChild).toBeNull();
    });

    it('returns null when rankings is null', () => {
      const { container } = render(<Stage2 rankings={null} />);
      
      expect(container.firstChild).toBeNull();
    });

    it('renders tabs for each ranking model', () => {
      render(<Stage2 rankings={mockRankings} labelToModel={mockLabelToModel} />);
      
      expect(screen.getByText('gpt-4')).toBeInTheDocument();
      expect(screen.getByText('gemini-pro')).toBeInTheDocument();
    });

    it('displays first ranking by default', () => {
      render(<Stage2 rankings={mockRankings} labelToModel={mockLabelToModel} />);
      
      expect(screen.getByText('openai/gpt-4')).toBeInTheDocument();
      expect(screen.getByText(/Response A is excellent/)).toBeInTheDocument();
    });
  });

  describe('De-anonymization', () => {
    it('replaces Response labels with model names', () => {
      render(<Stage2 rankings={mockRankings} labelToModel={mockLabelToModel} />);
      
      // Check that model names appear in bold (markdown ** **)
      expect(screen.getByText(/gpt-4/)).toBeInTheDocument();
    });

    it('handles missing labelToModel mapping', () => {
      render(<Stage2 rankings={mockRankings} labelToModel={null} />);
      
      // Should still render without crashing
      expect(screen.getByText('openai/gpt-4')).toBeInTheDocument();
    });

    it('preserves original text when no mapping exists', () => {
      const rankingsWithUnknown = [
        {
          model: 'test/model',
          ranking: 'Response D is good.\n\nFINAL RANKING:\n1. Response D',
          parsed_ranking: ['Response D'],
        },
      ];
      
      render(<Stage2 rankings={rankingsWithUnknown} labelToModel={mockLabelToModel} />);
      
      expect(screen.getByText(/Response D/)).toBeInTheDocument();
    });
  });

  describe('Parsed Rankings', () => {
    it('displays extracted ranking list', () => {
      render(<Stage2 rankings={mockRankings} labelToModel={mockLabelToModel} />);
      
      expect(screen.getByText('Extracted Ranking:')).toBeInTheDocument();
      
      // Should show model names instead of labels
      expect(screen.getByText('gpt-4')).toBeInTheDocument();
      expect(screen.getByText('gemini-pro')).toBeInTheDocument();
      expect(screen.getByText('claude')).toBeInTheDocument();
    });

    it('handles empty parsed ranking', () => {
      const emptyParsed = [
        {
          model: 'test/model',
          ranking: 'Some text without ranking',
          parsed_ranking: [],
        },
      ];
      
      render(<Stage2 rankings={emptyParsed} labelToModel={mockLabelToModel} />);
      
      expect(screen.queryByText('Extracted Ranking:')).not.toBeInTheDocument();
    });

    it('handles missing parsed_ranking field', () => {
      const noParsed = [
        {
          model: 'test/model',
          ranking: 'Some ranking text',
        },
      ];
      
      render(<Stage2 rankings={noParsed} labelToModel={mockLabelToModel} />);
      
      expect(screen.queryByText('Extracted Ranking:')).not.toBeInTheDocument();
    });
  });

  describe('Aggregate Rankings', () => {
    it('displays aggregate rankings section', () => {
      render(
        <Stage2
          rankings={mockRankings}
          labelToModel={mockLabelToModel}
          aggregateRankings={mockAggregateRankings}
        />
      );
      
      expect(screen.getByText('Aggregate Rankings (Street Cred)')).toBeInTheDocument();
    });

    it('shows all aggregate ranking items', () => {
      render(
        <Stage2
          rankings={mockRankings}
          labelToModel={mockLabelToModel}
          aggregateRankings={mockAggregateRankings}
        />
      );
      
      expect(screen.getByText('#1')).toBeInTheDocument();
      expect(screen.getByText('#2')).toBeInTheDocument();
      expect(screen.getByText('#3')).toBeInTheDocument();
    });

    it('displays average rank scores', () => {
      render(
        <Stage2
          rankings={mockRankings}
          labelToModel={mockLabelToModel}
          aggregateRankings={mockAggregateRankings}
        />
      );
      
      expect(screen.getByText('Avg: 1.50')).toBeInTheDocument();
      expect(screen.getByText('Avg: 2.00')).toBeInTheDocument();
      expect(screen.getByText('Avg: 3.00')).toBeInTheDocument();
    });

    it('displays vote counts', () => {
      render(
        <Stage2
          rankings={mockRankings}
          labelToModel={mockLabelToModel}
          aggregateRankings={mockAggregateRankings}
        />
      );
      
      expect(screen.getAllByText('(2 votes)')).toHaveLength(3);
    });

    it('hides aggregate section when no data', () => {
      render(<Stage2 rankings={mockRankings} labelToModel={mockLabelToModel} aggregateRankings={[]} />);
      
      expect(screen.queryByText('Aggregate Rankings (Street Cred)')).not.toBeInTheDocument();
    });

    it('hides aggregate section when null', () => {
      render(<Stage2 rankings={mockRankings} labelToModel={mockLabelToModel} aggregateRankings={null} />);
      
      expect(screen.queryByText('Aggregate Rankings (Street Cred)')).not.toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    it('switches between ranking tabs', () => {
      render(<Stage2 rankings={mockRankings} labelToModel={mockLabelToModel} />);
      
      const geminiTab = screen.getByText('gemini-pro');
      fireEvent.click(geminiTab);
      
      expect(screen.getByText('google/gemini-pro')).toBeInTheDocument();
      expect(screen.getByText(/Response B is best/)).toBeInTheDocument();
    });

    it('highlights active tab', () => {
      render(<Stage2 rankings={mockRankings} labelToModel={mockLabelToModel} />);
      
      const gptTab = screen.getByText('gpt-4');
      expect(gptTab).toHaveClass('active');
      
      const geminiTab = screen.getByText('gemini-pro');
      fireEvent.click(geminiTab);
      
      expect(geminiTab).toHaveClass('active');
      expect(gptTab).not.toHaveClass('active');
    });

    it('updates parsed ranking when switching tabs', () => {
      render(<Stage2 rankings={mockRankings} labelToModel={mockLabelToModel} />);
      
      // First tab shows gpt-4 first in parsed ranking
      let listItems = screen.getAllByRole('listitem');
      expect(listItems[0]).toHaveTextContent('gpt-4');
      
      // Switch to second tab
      fireEvent.click(screen.getByText('gemini-pro'));
      
      // Second tab shows gemini-pro first in parsed ranking
      listItems = screen.getAllByRole('listitem');
      expect(listItems[0]).toHaveTextContent('gemini-pro');
    });
  });

  describe('Edge Cases', () => {
    it('handles single ranking', () => {
      const singleRanking = [mockRankings[0]];
      render(<Stage2 rankings={singleRanking} labelToModel={mockLabelToModel} />);
      
      expect(screen.getByText('gpt-4')).toBeInTheDocument();
      expect(screen.queryByText('gemini-pro')).not.toBeInTheDocument();
    });

    it('handles very long ranking text', () => {
      const longRanking = [
        {
          model: 'test/model',
          ranking: 'A'.repeat(10000) + '\n\nFINAL RANKING:\n1. Response A',
          parsed_ranking: ['Response A'],
        },
      ];
      
      render(<Stage2 rankings={longRanking} labelToModel={mockLabelToModel} />);
      
      expect(screen.getByText('test/model')).toBeInTheDocument();
    });

    it('handles unicode in ranking text', () => {
      const unicodeRanking = [
        {
          model: 'test/model',
          ranking: '你好 🌍\n\nFINAL RANKING:\n1. Response A',
          parsed_ranking: ['Response A'],
        },
      ];
      
      render(<Stage2 rankings={unicodeRanking} labelToModel={mockLabelToModel} />);
      
      expect(screen.getByText(/你好/)).toBeInTheDocument();
    });

    it('handles model without slash in name', () => {
      const noSlashModel = [
        {
          model: 'localmodel',
          ranking: 'Text\n\nFINAL RANKING:\n1. Response A',
          parsed_ranking: ['Response A'],
        },
      ];
      
      render(<Stage2 rankings={noSlashModel} labelToModel={mockLabelToModel} />);
      
      expect(screen.getByText('localmodel')).toBeInTheDocument();
    });
  });

  describe('Markdown Rendering', () => {
    it('renders markdown in ranking text', () => {
      const markdownRanking = [
        {
          model: 'test/model',
          ranking: '# Analysis\n\n**Bold** and *italic*\n\nFINAL RANKING:\n1. Response A',
          parsed_ranking: ['Response A'],
        },
      ];
      
      render(<Stage2 rankings={markdownRanking} labelToModel={mockLabelToModel} />);
      
      const heading = screen.getByText('Analysis');
      expect(heading.tagName).toBe('H1');
    });
  });
});