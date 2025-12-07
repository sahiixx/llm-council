/**
 * Comprehensive unit tests for Stage2 component
 */

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Stage2 from './Stage2';

describe('Stage2 Component', () => {
  const mockRankings = [
    { 
      model: 'openai/gpt-4', 
      ranking: 'Evaluation text\nFINAL RANKING:\n1. Response A\n2. Response B',
      parsed_ranking: ['Response A', 'Response B']
    },
    { 
      model: 'anthropic/claude', 
      ranking: 'Different evaluation\nFINAL RANKING:\n1. Response B\n2. Response A',
      parsed_ranking: ['Response B', 'Response A']
    },
  ];

  const mockLabelToModel = {
    'Response A': 'openai/gpt-4',
    'Response B': 'anthropic/claude',
  };

  const mockAggregateRankings = [
    { model: 'openai/gpt-4', average_rank: 1.5, rankings_count: 2 },
    { model: 'anthropic/claude', average_rank: 1.5, rankings_count: 2 },
  ];

  describe('Rendering', () => {
    it('should render null when no rankings', () => {
      const { container } = render(<Stage2 rankings={null} />);
      expect(container.firstChild).toBeNull();
    });

    it('should render null when empty rankings', () => {
      const { container } = render(<Stage2 rankings={[]} />);
      expect(container.firstChild).toBeNull();
    });

    it('should render stage title', () => {
      render(<Stage2 rankings={mockRankings} labelToModel={mockLabelToModel} />);
      expect(screen.getByText('Stage 2: Peer Rankings')).toBeInTheDocument();
    });

    it('should render model tabs', () => {
      render(<Stage2 rankings={mockRankings} labelToModel={mockLabelToModel} />);
      expect(screen.getByText('gpt-4')).toBeInTheDocument();
      expect(screen.getByText('claude')).toBeInTheDocument();
    });

    it('should render aggregate rankings when provided', () => {
      render(<Stage2 
        rankings={mockRankings} 
        labelToModel={mockLabelToModel}
        aggregateRankings={mockAggregateRankings}
      />);
      expect(screen.getByText(/Aggregate Rankings/)).toBeInTheDocument();
    });

    it('should display parsed ranking list', () => {
      render(<Stage2 rankings={mockRankings} labelToModel={mockLabelToModel} />);
      expect(screen.getByText('Extracted Ranking:')).toBeInTheDocument();
    });
  });

  describe('De-anonymization', () => {
    it('should replace Response labels with model names', () => {
      render(<Stage2 rankings={mockRankings} labelToModel={mockLabelToModel} />);
      // Model names should appear in bold in the markdown
      expect(screen.getByText(/gpt-4/)).toBeInTheDocument();
    });

    it('should handle missing labelToModel', () => {
      render(<Stage2 rankings={mockRankings} labelToModel={null} />);
      expect(screen.getByText(/Response A/)).toBeInTheDocument();
    });
  });

  describe('Tab Switching', () => {
    it('should switch between ranking tabs', () => {
      render(<Stage2 rankings={mockRankings} labelToModel={mockLabelToModel} />);
      
      fireEvent.click(screen.getByText('claude'));
      expect(screen.getByText(/Different evaluation/)).toBeInTheDocument();
    });

    it('should highlight active tab', () => {
      const { container } = render(<Stage2 rankings={mockRankings} labelToModel={mockLabelToModel} />);
      
      const tabs = container.querySelectorAll('.tab');
      expect(tabs[0]).toHaveClass('active');
    });
  });

  describe('Aggregate Rankings', () => {
    it('should display aggregate rankings table', () => {
      render(<Stage2 
        rankings={mockRankings} 
        labelToModel={mockLabelToModel}
        aggregateRankings={mockAggregateRankings}
      />);
      
      expect(screen.getByText(/Avg: 1.50/)).toBeInTheDocument();
      expect(screen.getByText(/2 votes/)).toBeInTheDocument();
    });

    it('should show rank positions', () => {
      render(<Stage2 
        rankings={mockRankings} 
        labelToModel={mockLabelToModel}
        aggregateRankings={mockAggregateRankings}
      />);
      
      expect(screen.getByText('#1')).toBeInTheDocument();
      expect(screen.getByText('#2')).toBeInTheDocument();
    });
  });
});