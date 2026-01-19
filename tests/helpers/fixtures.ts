import type { EthosStats } from '../../src/types/ethos-stats.js';

/**
 * Sample EthosStats data for testing
 * Based on typical API response structure
 */
export const mockEthosStats: EthosStats = {
  totalVotes: 12345,
  uniqueVoters: 5678,
  activityId: 223,
  type: 'attestation',
  lastUpdated: '2024-01-15T10:30:00Z',
  stats: {
    daily: {
      '2024-01-15': 150,
      '2024-01-14': 145,
    },
    weekly: {
      '2024-W03': 1050,
      '2024-W02': 980,
    },
  },
};

/**
 * Alternative mock stats for testing different scenarios
 */
export const mockEthosStatsAlt: EthosStats = {
  totalVotes: 99999,
  uniqueVoters: 8888,
  activityId: 223,
  type: 'attestation',
  lastUpdated: '2024-01-16T12:00:00Z',
};
