import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { logger } from '../../../src/config/logger.js';
import { EthosStatsScheduler } from '../../../src/services/ethos-stats-scheduler.js';
import { ethosStatsService } from '../../../src/services/ethos-stats-service.js';

// Mock dependencies
vi.mock('../../../src/config/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../../../src/services/ethos-stats-service.js', () => ({
  ethosStatsService: {
    refreshCache: vi.fn(),
  },
}));

describe('EthosStatsScheduler', () => {
  let scheduler: EthosStatsScheduler;

  beforeEach(() => {
    vi.useFakeTimers();
    scheduler = new EthosStatsScheduler();
    vi.clearAllMocks();
  });

  afterEach(() => {
    scheduler.stop();
    vi.useRealTimers();
  });

  describe('start', () => {
    it('should start scheduler and trigger first run', async () => {
      vi.mocked(ethosStatsService.refreshCache).mockResolvedValue(undefined);

      await scheduler.start();

      // First run should be immediate
      expect(ethosStatsService.refreshCache).toHaveBeenCalledTimes(1);
      expect(logger.info).toHaveBeenCalledWith(
        { intervalMs: 12 * 60 * 60 * 1000 },
        'Starting Ethos stats scheduler'
      );
      expect(logger.info).toHaveBeenCalledWith('Starting cache refresh cycle');
    });

    it('should prevent multiple starts (idempotent)', async () => {
      vi.mocked(ethosStatsService.refreshCache).mockResolvedValue(undefined);

      await scheduler.start();
      await scheduler.start();

      // Should only log warning on second start
      expect(logger.warn).toHaveBeenCalledWith('Scheduler is already running');
      // refreshCache should still only be called once (from first start)
      expect(ethosStatsService.refreshCache).toHaveBeenCalledTimes(1);
    });

    it('should log appropriate messages on start', async () => {
      vi.mocked(ethosStatsService.refreshCache).mockResolvedValue(undefined);

      await scheduler.start();

      expect(logger.info).toHaveBeenCalledWith(
        { intervalMs: 12 * 60 * 60 * 1000 },
        'Starting Ethos stats scheduler'
      );
    });
  });

  describe('run (via start)', () => {
    it('should execute refresh cycle at scheduled intervals', async () => {
      vi.mocked(ethosStatsService.refreshCache).mockResolvedValue(undefined);

      await scheduler.start();

      // First run is immediate
      expect(ethosStatsService.refreshCache).toHaveBeenCalledTimes(1);

      // Advance time by 12 hours
      await vi.advanceTimersByTimeAsync(12 * 60 * 60 * 1000);

      // Should have been called again
      expect(ethosStatsService.refreshCache).toHaveBeenCalledTimes(2);

      // Advance another 12 hours
      await vi.advanceTimersByTimeAsync(12 * 60 * 60 * 1000);

      // Should have been called a third time
      expect(ethosStatsService.refreshCache).toHaveBeenCalledTimes(3);
    });

    it('should handle errors in refresh cycle gracefully', async () => {
      const error = new Error('Refresh failed');
      vi.mocked(ethosStatsService.refreshCache)
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce(undefined);

      await scheduler.start();

      // First run fails
      expect(ethosStatsService.refreshCache).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith(
        { err: error },
        'Cache refresh cycle failed'
      );

      // Advance time - should continue scheduling despite error
      await vi.advanceTimersByTimeAsync(12 * 60 * 60 * 1000);

      // Should have been called again
      expect(ethosStatsService.refreshCache).toHaveBeenCalledTimes(2);
      expect(logger.info).toHaveBeenCalledWith(
        'Cache refresh cycle completed successfully'
      );
    });

    it('should continue scheduling after successful run', async () => {
      vi.mocked(ethosStatsService.refreshCache).mockResolvedValue(undefined);

      await scheduler.start();

      // First run
      expect(ethosStatsService.refreshCache).toHaveBeenCalledTimes(1);
      expect(logger.info).toHaveBeenCalledWith(
        'Cache refresh cycle completed successfully'
      );

      // Advance time
      vi.advanceTimersByTime(12 * 60 * 60 * 1000);

      // Second run
      expect(ethosStatsService.refreshCache).toHaveBeenCalledTimes(2);
    });

    it('should stop scheduling when isStopping is true', async () => {
      vi.mocked(ethosStatsService.refreshCache).mockResolvedValue(undefined);

      await scheduler.start();

      // First run
      expect(ethosStatsService.refreshCache).toHaveBeenCalledTimes(1);

      // Stop the scheduler
      scheduler.stop();

      // Advance time - should not trigger another run
      await vi.advanceTimersByTimeAsync(12 * 60 * 60 * 1000);

      // Should still only be called once
      expect(ethosStatsService.refreshCache).toHaveBeenCalledTimes(1);
    });

    it('should prevent overlapping executions', async () => {
      // Create a promise that resolves after a delay
      let resolveRefresh: () => void;
      const refreshPromise = new Promise<void>((resolve) => {
        resolveRefresh = resolve;
      });

      vi.mocked(ethosStatsService.refreshCache).mockReturnValue(refreshPromise);

      await scheduler.start();

      // First run is in progress
      expect(ethosStatsService.refreshCache).toHaveBeenCalledTimes(1);

      // Advance time while first run is still in progress
      await vi.advanceTimersByTimeAsync(12 * 60 * 60 * 1000);

      // Should not have been called again yet
      expect(ethosStatsService.refreshCache).toHaveBeenCalledTimes(1);

      // Resolve the first run
      resolveRefresh!();
      await refreshPromise;

      // Now advance time - should schedule next run
      await vi.advanceTimersByTimeAsync(12 * 60 * 60 * 1000);

      // Should have been called again
      expect(ethosStatsService.refreshCache).toHaveBeenCalledTimes(2);
    }, 10000);
  });

  describe('stop', () => {
    it('should clear timeout and stop scheduler', async () => {
      vi.mocked(ethosStatsService.refreshCache).mockResolvedValue(undefined);

      await scheduler.start();
      expect(ethosStatsService.refreshCache).toHaveBeenCalledTimes(1);

      scheduler.stop();

      expect(logger.info).toHaveBeenCalledWith('Stopped Ethos stats scheduler');

      // Advance time - should not trigger another run
      await vi.advanceTimersByTimeAsync(12 * 60 * 60 * 1000);

      expect(ethosStatsService.refreshCache).toHaveBeenCalledTimes(1);
    });

    it('should prevent new cycles from starting', async () => {
      vi.mocked(ethosStatsService.refreshCache).mockResolvedValue(undefined);

      await scheduler.start();
      expect(ethosStatsService.refreshCache).toHaveBeenCalledTimes(1);

      // Wait for the first run to complete
      await vi.runAllTicks();

      scheduler.stop();

      // Try to start again after stop
      await scheduler.start();

      // Should start fresh (not be blocked)
      expect(ethosStatsService.refreshCache).toHaveBeenCalledTimes(2);
    });

    it('should handle stop when not started', () => {
      // Should not throw
      expect(() => scheduler.stop()).not.toThrow();
      expect(logger.info).toHaveBeenCalledWith('Stopped Ethos stats scheduler');
    });

    it('should log appropriate messages on stop', async () => {
      vi.mocked(ethosStatsService.refreshCache).mockResolvedValue(undefined);

      await scheduler.start();
      scheduler.stop();

      expect(logger.info).toHaveBeenCalledWith('Stopped Ethos stats scheduler');
    });
  });
});
