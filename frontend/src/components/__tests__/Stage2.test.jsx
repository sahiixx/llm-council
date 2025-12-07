import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Stage2 from '../Stage2';

describe('Stage2 Component', () => {
  it('should return null when no rankings', () => {
    const { container } = render(<Stage2 rankings={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render stage title', () => {
    const rankings = [
      { model: 'openai/gpt-4', ranking: 'Ranking text' },
    ];
    render(<Stage2 rankings={rankings} />);
    expect(screen.getByText('Stage 2: Peer Rankings')).toBeInTheDocument();
  });

  it('should render tabs for each model', () => {
    const rankings = [
      { model: 'openai/gpt-4', ranking: 'R1' },
      { model: 'anthropic/claude', ranking: 'R2' },
    ];
    render(<Stage2 rankings={rankings} />);
    expect(screen.getByText('gpt-4')).toBeInTheDocument();
    expect(screen.getByText('claude')).toBeInTheDocument();
  });

  it('should de-anonymize response labels', () => {
    const rankings = [
      { model: 'openai/gpt-4', ranking: 'Response A is best' },
    ];
    const labelToModel = {
      'Response A': 'openai/gpt-4',
    };
    render(<Stage2 rankings={rankings} labelToModel={labelToModel} />);
    expect(screen.getByText(/gpt-4.*is best/)).toBeInTheDocument();
  });

  it('should show parsed ranking', () => {
    const rankings = [
      {
        model: 'openai/gpt-4',
        ranking: 'Text',
        parsed_ranking: ['Response A', 'Response B'],
      },
    ];
    const labelToModel = {
      'Response A': 'model1',
      'Response B': 'model2',
    };
    render(<Stage2 rankings={rankings} labelToModel={labelToModel} />);
    expect(screen.getByText('Extracted Ranking:')).toBeInTheDocument();
  });

  it('should render aggregate rankings', () => {
    const rankings = [{ model: 'openai/gpt-4', ranking: 'Text' }];
    const aggregateRankings = [
      { model: 'model1', average_rank: 1.5, rankings_count: 3 },
    ];
    render(<Stage2 rankings={rankings} aggregateRankings={aggregateRankings} />);
    expect(screen.getByText(/Aggregate Rankings/i)).toBeInTheDocument();
    expect(screen.getByText(/Avg: 1.50/)).toBeInTheDocument();
  });

  it('should switch tabs on click', async () => {
    const user = userEvent.setup();
    const rankings = [
      { model: 'openai/gpt-4', ranking: 'First ranking' },
      { model: 'anthropic/claude', ranking: 'Second ranking' },
    ];
    render(<Stage2 rankings={rankings} />);
    
    await user.click(screen.getByText('claude'));
    expect(screen.getByText('Second ranking')).toBeInTheDocument();
  });

  it('should not crash without labelToModel', () => {
    const rankings = [
      { model: 'openai/gpt-4', ranking: 'Response A is best' },
    ];
    render(<Stage2 rankings={rankings} />);
    expect(screen.getByText('Response A is best')).toBeInTheDocument();
  });
});