import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Stage2 from '../../components/Stage2';

vi.mock('react-markdown', () => ({
  default: ({ children }) => <div>{children}</div>,
}));

describe('Stage2', () => {
  const mockRankings = [
    { model: 'openai/gpt-4', ranking: 'Response A is best. Response B is good.' },
    { model: 'anthropic/claude', ranking: 'Response B is superior.' },
  ];

  const mockLabelToModel = {
    'Response A': 'model1',
    'Response B': 'model2',
  };

  const mockAggregateRankings = [
    { model: 'model1', average_rank: 1.5, rankings_count: 2 },
    { model: 'model2', average_rank: 2.0, rankings_count: 2 },
  ];

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

  it('displays tabs for each ranking model', () => {
    render(
      <Stage2
        rankings={mockRankings}
        labelToModel={mockLabelToModel}
        aggregateRankings={mockAggregateRankings}
      />
    );
    expect(screen.getByText('gpt-4')).toBeInTheDocument();
    expect(screen.getByText('claude')).toBeInTheDocument();
  });

  it('de-anonymizes response labels in text', () => {
    render(
      <Stage2
        rankings={mockRankings}
        labelToModel={mockLabelToModel}
        aggregateRankings={mockAggregateRankings}
      />
    );
    
    expect(screen.getByText(/model1.*is best/)).toBeInTheDocument();
  });

  it('switches ranking tabs', async () => {
    render(
      <Stage2
        rankings={mockRankings}
        labelToModel={mockLabelToModel}
        aggregateRankings={mockAggregateRankings}
      />
    );
    
    await userEvent.click(screen.getByText('claude'));
    
    expect(screen.getByText(/model2.*is superior/)).toBeInTheDocument();
  });

  it('returns null for empty rankings', () => {
    const { container } = render(
      <Stage2 rankings={[]} labelToModel={{}} aggregateRankings={[]} />
    );
    expect(container.firstChild).toBeNull();
  });
});