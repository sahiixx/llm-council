/**
 * Comprehensive unit tests for frontend/src/components/Stage2.jsx
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Stage2 from './Stage2';

describe('Stage2 Component', () => {
  const mockRankings = [
    {
      model: 'openai/gpt-4',
      ranking: 'Response A is best.\n\nFINAL RANKING:\n1. Response A\n2. Response B',
      parsed_ranking: ['Response A', 'Response B'],
    },
    {
      model: 'anthropic/claude',
      ranking: 'Response B excels.\n\nFINAL RANKING:\n1. Response B\n2. Response A',
      parsed_ranking: ['Response B', 'Response A'],
    },
  ];

  const mockLabelToModel = {
    'Response A': 'model1',
    'Response B': 'model2',
  };

  const mockAggregateRankings = [
    { model: 'model1', average_rank: 1.5, rankings_count: 2 },
    { model: 'model2', average_rank: 1.5, rankings_count: 2 },
  ];

  it('should render nothing when no rankings', () => {
    const { container } = render(<Stage2 rankings={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render stage title', () => {
    render(<Stage2 rankings={mockRankings} labelToModel={mockLabelToModel} />);
    expect(screen.getByText('Stage 2: Peer Rankings')).toBeInTheDocument();
  });

  it('should render tabs for each model', () => {
    render(<Stage2 rankings={mockRankings} labelToModel={mockLabelToModel} />);
    
    expect(screen.getByText('gpt-4')).toBeInTheDocument();
    expect(screen.getByText('claude')).toBeInTheDocument();
  });

  it('should show first ranking by default', () => {
    render(<Stage2 rankings={mockRankings} labelToModel={mockLabelToModel} />);
    expect(screen.getByText(/Response A is best/i)).toBeInTheDocument();
  });

  it('should switch rankings when tab clicked', async () => {
    render(<Stage2 rankings={mockRankings} labelToModel={mockLabelToModel} />);
    
    const claudeTab = screen.getByText('claude');
    await userEvent.click(claudeTab);
    
    expect(screen.getByText(/Response B excels/i)).toBeInTheDocument();
  });

  it('should de-anonymize response labels', () => {
    render(<Stage2 rankings={mockRankings} labelToModel={mockLabelToModel} />);
    
    // Should replace "Response A" with **model1**
    const content = screen.getByText((content, element) => {
      return element.tagName === 'STRONG' && content.includes('model1');
    });
    expect(content).toBeInTheDocument();
  });

  it('should render aggregate rankings section', () => {
    render(
      <Stage2
        rankings={mockRankings}
        labelToModel={mockLabelToModel}
        aggregateRankings={mockAggregateRankings}
      />
    );
    
    expect(screen.getByText('Aggregate Rankings (Street Cred)')).toBeInTheDocument();
  });

  it('should display aggregate ranking scores', () => {
    render(
      <Stage2
        rankings={mockRankings}
        labelToModel={mockLabelToModel}
        aggregateRankings={mockAggregateRankings}
      />
    );
    
    expect(screen.getByText(/Avg: 1.50/)).toBeInTheDocument();
  });

  it('should display rankings count', () => {
    render(
      <Stage2
        rankings={mockRankings}
        labelToModel={mockLabelToModel}
        aggregateRankings={mockAggregateRankings}
      />
    );
    
    expect(screen.getByText('(2 votes)')).toBeInTheDocument();
  });

  it('should render parsed ranking when available', () => {
    render(<Stage2 rankings={mockRankings} labelToModel={mockLabelToModel} />);
    
    expect(screen.getByText('Extracted Ranking:')).toBeInTheDocument();
  });

  it('should handle missing labelToModel gracefully', () => {
    render(<Stage2 rankings={mockRankings} />);
    
    // Should still render, but labels won't be de-anonymized
    expect(screen.getByText('Stage 2: Peer Rankings')).toBeInTheDocument();
  });

  it('should handle missing aggregateRankings', () => {
    render(<Stage2 rankings={mockRankings} labelToModel={mockLabelToModel} />);
    
    // Should not show aggregate section
    expect(screen.queryByText('Aggregate Rankings (Street Cred)')).not.toBeInTheDocument();
  });

  it('should display model short names in tabs', () => {
    render(<Stage2 rankings={mockRankings} labelToModel={mockLabelToModel} />);
    
    // Should extract "gpt-4" from "openai/gpt-4"
    expect(screen.getByText('gpt-4')).toBeInTheDocument();
    expect(screen.getByText('claude')).toBeInTheDocument();
  });

  it('should handle empty parsed_ranking', () => {
    const rankings = [{
      model: 'test/model',
      ranking: 'Some text without ranking',
      parsed_ranking: [],
    }];
    
    render(<Stage2 rankings={rankings} labelToModel={mockLabelToModel} />);
    
    // Should not show extracted ranking section
    expect(screen.queryByText('Extracted Ranking:')).not.toBeInTheDocument();
  });

  it('should render markdown in ranking text', () => {
    const rankings = [{
      model: 'test/model',
      ranking: '**Bold** ranking text',
      parsed_ranking: [],
    }];
    
    render(<Stage2 rankings={rankings} />);
    
    const bold = screen.getByText('Bold');
    expect(bold.tagName).toBe('STRONG');
  });
});