import type { Express } from 'express';
import { app } from '../../src/app.js';

/**
 * Factory function to create Express app instance for testing
 * This allows us to test the app without starting the server
 */
export function createTestApp(): Express {
  return app;
}
