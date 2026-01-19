import { logger } from '../config/logger.js';
import { ethosStatsService } from './ethos-stats-service.js';

const SCHEDULE_INTERVAL_MS = 12 * 60 * 60 * 1000; // 12 hours

export class EthosStatsScheduler {
  // Use ReturnType to avoid environment-specific type issues (Node vs Browser)
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private isStopping = false;

  public async start(): Promise<void> {
    if (this.timeoutId !== null) {
      logger.warn('Scheduler is already running');
      return;
    }

    logger.info(
      { intervalMs: SCHEDULE_INTERVAL_MS },
      'Starting Ethos stats scheduler'
    );

    // Start the recursive loop
    await this.run();
  }

  private async run(): Promise<void> {
    if (this.isStopping) return;

    try {
      logger.info('Starting cache refresh cycle');
      await ethosStatsService.refreshCache();
      logger.info('Cache refresh cycle completed successfully');
    } catch (error) {
      logger.error({ err: error }, 'Cache refresh cycle failed');
    } finally {
      // Schedule the next run ONLY after the current one is finished
      // This prevents overlapping executions
      if (!this.isStopping) {
        this.timeoutId = setTimeout(() => this.run(), SCHEDULE_INTERVAL_MS);
      }
    }
  }

  public stop(): void {
    this.isStopping = true;
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    logger.info('Stopped Ethos stats scheduler');
  }
}

export const ethosStatsScheduler = new EthosStatsScheduler();
