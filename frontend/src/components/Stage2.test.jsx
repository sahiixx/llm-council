import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Stage2 from './Stage2';

describe('Stage2', () => {
  const mockRankings = [
    { model: 'openai/gpt-4', ranking: 'FINAL RANKING:\n1. Response A\n2. Response B\n3. Response C' },
    { model: 'anthropic/claude-3', ranking: 'FINAL RANKING:\n1. Response B\n2. Response A\n3. Response C' },
  ];

  const mockMetadata = {
    label_to_model: {
      'Response A': 'openai/gpt-4',
      'Response B': 'anthropic/claude-3',
      'Response C': 'google/gemini-pro',
    },
    aggregate_rankings: [
      { model: 'openai/gpt-4', average_rank: 1.5, rankings_count: 2 },
      { model: 'anthropic/claude-3', average_rank: 1.5, rankings_count: 2 },
      { model: 'google/gemini-pro', average_rank: 3.0, rankings_count: 2 },
    ],
  };

  describe('Rendering', () => {
    it('should render stage title', () => {
      render(<Stage2 rankings={mockRankings} metadata={mockMetadata} />);
      expect(screen.getByText(/Stage 2/i)).toBeInTheDocument();
    });

    it('should render ranking information', () => {
      render(<Stage2 rankings={mockRankings} metadata={mockMetadata} />);
      
      expect(screen.getByText(/Response A/)).toBeInTheDocument();
      expect(screen.getByText(/Response B/)).toBeInTheDocument();
      expect(screen.getByText(/Response C/)).toBeInTheDocument();
    });

    it('should render aggregate rankings if provided', () => {
      render(<Stage2 rankings={mockRankings} metadata={mockMetadata} />);
      
      expect(screen.getByText(/average_rank|1\.5|3\.0/i)).toBeInTheDocument();
    });

    it('should render empty state with no rankings', () => {
      render(<Stage2 rankings={[]} metadata={{ label_to_model: {}, aggregate_rankings: [] }} />);
      
      expect(screen.getByText(/Stage 2/i)).toBeInTheDocument();
    });

    it('should render single ranking', () => {
      const singleRanking = [mockRankings[0]];
      render(<Stage2 rankings={singleRanking} metadata={mockMetadata} />);
      
      expect(screen.getByText(/Response A/)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty ranking content', () => {
      const rankings = [{ model: 'test-model', ranking: '' }];
      render(<Stage2 rankings={rankings} metadata={{ label_to_model: {}, aggregate_rankings: [] }} />);
      
      expect(screen.getByText(/test-model/i)).toBeInTheDocument();
    });

    it('should handle malformed ranking text', () => {
      const rankings = [{ model: 'test-model', ranking: 'Not a proper ranking format' }];
      render(<Stage2 rankings={rankings} metadata={{ label_to_model: {}, aggregate_rankings: [] }} />);
      
      expect(screen.getByText(/Not a proper ranking/)).toBeInTheDocument();
    });

    it('should handle missing metadata', () => {
      expect(() => {
        render(<Stage2 rankings={mockRankings} metadata={null} />);
      }).not.toThrow();
    });

    it('should handle empty label_to_model', () => {
      const metadata = { label_to_model: {}, aggregate_rankings: [] };
      render(<Stage2 rankings={mockRankings} metadata={metadata} />);
      
      expect(screen.getByText(/Stage 2/i)).toBeInTheDocument();
    });

    it('should handle unicode in rankings', () => {
      const rankings = [{ model: 'test', ranking: '你好 café 🎉' }];
      render(<Stage2 rankings={rankings} metadata={{ label_to_model: {}, aggregate_rankings: [] }} />);
      
      expect(screen.getByText(/你好/)).toBeInTheDocument();
    });
  });

  describe('Props Validation', () => {
    it('should not crash with undefined rankings', () => {
      expect(() => {
        render(<Stage2 rankings={undefined} metadata={mockMetadata} />);
      }).not.toThrow();
    });

    it('should not crash with null rankings', () => {
      expect(() => {
        render(<Stage2 rankings={null} metadata={mockMetadata} />);
      }).not.toThrow();
    });
  });
});