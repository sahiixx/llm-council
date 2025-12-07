/**
 * Comprehensive unit tests for Stage2 component
 */

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Stage2 from '../../components/Stage2';

describe('Stage2', () => {
  const mockRankings = [
    {
      model: 'openai/gpt-4',
      ranking: 'Response A is best. FINAL RANKING:\n1. Response A\n2. Response B',
      parsed_ranking: ['Response A', 'Response B'],
    },
    {
      model: 'google/gemini-pro',
      ranking: 'Response B is better. FINAL RANKING:\n1. Response B\n2. Response A',
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

  it('should render stage title', () => {
    render(<Stage2 rankings={mockRankings} labelToModel={mockLabelToModel} />);
    expect(screen.getByText('Stage 2: Peer Rankings')).toBeInTheDocument();
  });

  it('should render raw evaluations section', () => {
    render(<Stage2 rankings={mockRankings} labelToModel={mockLabelToModel} />);
    expect(screen.getByText('Raw Evaluations')).toBeInTheDocument();
  });

  it('should render tabs for each model', () => {
    render(<Stage2 rankings={mockRankings} labelToModel={mockLabelToModel} />);
    
    expect(screen.getByText('gpt-4')).toBeInTheDocument();
    expect(screen.getByText('gemini-pro')).toBeInTheDocument();
  });

  it('should show first ranking by default', () => {
    render(<Stage2 rankings={mockRankings} labelToModel={mockLabelToModel} />);
    
    expect(screen.getByText(/Response A is best/)).toBeInTheDocument();
  });

  it('should switch ranking when tab is clicked', () => {
    render(<Stage2 rankings={mockRankings} labelToModel={mockLabelToModel} />);
    
    const geminiTab = screen.getByText('gemini-pro');
    fireEvent.click(geminiTab);
    
    expect(screen.getByText(/Response B is better/)).toBeInTheDocument();
  });

  it('should show parsed ranking list', () => {
    render(<Stage2 rankings={mockRankings} labelToModel={mockLabelToModel} />);
    
    expect(screen.getByText('Extracted Ranking:')).toBeInTheDocument();
    expect(screen.getByText('model1')).toBeInTheDocument();
    expect(screen.getByText('model2')).toBeInTheDocument();
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

  it('should show aggregate ranking details', () => {
    render(
      <Stage2
        rankings={mockRankings}
        labelToModel={mockLabelToModel}
        aggregateRankings={mockAggregateRankings}
      />
    );
    
    expect(screen.getByText(/Avg: 1.50/)).toBeInTheDocument();
    expect(screen.getByText(/\(2 votes\)/)).toBeInTheDocument();
  });

  it('should return null for empty rankings', () => {
    const { container } = render(<Stage2 rankings={[]} labelToModel={{}} />);
    expect(container.firstChild).toBeNull();
  });

  it('should return null for null rankings', () => {
    const { container } = render(<Stage2 rankings={null} labelToModel={{}} />);
    expect(container.firstChild).toBeNull();
  });

  it('should de-anonymize text correctly', () => {
    render(<Stage2 rankings={mockRankings} labelToModel={mockLabelToModel} />);
    
    // Should replace "Response A" with "**model1**"
    const text = screen.getByText(/model1/);
    expect(text).toBeInTheDocument();
  });

  it('should handle ranking without parsed ranking', () => {
    const rankingsNoParsed = [
      {
        model: 'test/model',
        ranking: 'Some ranking text',
      },
    ];

    render(<Stage2 rankings={rankingsNoParsed} labelToModel={{}} />);
    
    expect(screen.getByText('Some ranking text')).toBeInTheDocument();
  });

  it('should handle empty parsed ranking', () => {
    const rankingsEmptyParsed = [
      {
        model: 'test/model',
        ranking: 'Text',
        parsed_ranking: [],
      },
    ];

    render(<Stage2 rankings={rankingsEmptyParsed} labelToModel={{}} />);
    
    expect(screen.queryByText('Extracted Ranking:')).not.toBeInTheDocument();
  });

  it('should not show aggregate rankings if not provided', () => {
    render(<Stage2 rankings={mockRankings} labelToModel={mockLabelToModel} />);
    
    expect(screen.queryByText('Aggregate Rankings (Street Cred)')).not.toBeInTheDocument();
  });

  it('should handle empty aggregate rankings', () => {
    render(
      <Stage2
        rankings={mockRankings}
        labelToModel={mockLabelToModel}
        aggregateRankings={[]}
      />
    );
    
    expect(screen.queryByText('Aggregate Rankings (Street Cred)')).not.toBeInTheDocument();
  });

  it('should show rank positions in aggregate', () => {
    render(
      <Stage2
        rankings={mockRankings}
        labelToModel={mockLabelToModel}
        aggregateRankings={mockAggregateRankings}
      />
    );
    
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('#2')).toBeInTheDocument();
  });

  it('should format average rank with 2 decimal places', () => {
    const aggregateWithDecimals = [
      { model: 'model1', average_rank: 1.567, rankings_count: 3 },
    ];

    render(
      <Stage2
        rankings={mockRankings}
        labelToModel={mockLabelToModel}
        aggregateRankings={aggregateWithDecimals}
      />
    );
    
    expect(screen.getByText(/Avg: 1.57/)).toBeInTheDocument();
  });

  it('should extract short model names in parsed ranking', () => {
    const labelMap = {
      'Response A': 'provider/long-model-name',
    };

    const rankings = [
      {
        model: 'test/model',
        ranking: 'Text',
        parsed_ranking: ['Response A'],
      },
    ];

    render(<Stage2 rankings={rankings} labelToModel={labelMap} />);
    
    expect(screen.getByText('long-model-name')).toBeInTheDocument();
  });

  it('should handle label not in mapping', () => {
    const rankings = [
      {
        model: 'test/model',
        ranking: 'Text',
        parsed_ranking: ['Unknown Label'],
      },
    ];

    render(<Stage2 rankings={rankings} labelToModel={{}} />);
    
    expect(screen.getByText('Unknown Label')).toBeInTheDocument();
  });
});