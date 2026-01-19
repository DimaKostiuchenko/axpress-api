import type { ErrorRequestHandler, Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ZodError } from 'zod';

import { env } from '../../../src/config/env.js';
import { logger } from '../../../src/config/logger.js';
import { errorHandler } from '../../../src/middlewares/error-handler.js';
import { createMockRequest, createMockResponse } from '../../helpers/mocks.js';

// Mock dependencies
vi.mock('../../../src/config/env.js', () => ({
  env: {
    NODE_ENV: 'test',
  },
}));

vi.mock('../../../src/config/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('Error Handler Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: ReturnType<typeof vi.fn>;
  let status: ReturnType<typeof vi.fn>;
  let json: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    const request = createMockRequest();
    const { res, status: resStatus, json: resJson } = createMockResponse();
    mockReq = request as Partial<Request>;
    mockRes = res;
    status = resStatus;
    json = resJson;
    mockNext = vi.fn();
    vi.mocked(env).NODE_ENV = 'test'; // Reset to default
    vi.clearAllMocks();
  });

  describe('ZodError handling', () => {
    it('should handle ZodError with 400 status and formatted details', () => {
      const zodError = new ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          path: ['name'],
          message: 'Expected string, received number',
        },
        {
          code: 'invalid_type',
          expected: 'number',
          received: 'string',
          path: ['age'],
          message: 'Expected number, received string',
        },
      ]);

      (errorHandler as ErrorRequestHandler)(
        zodError,
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(status).toHaveBeenCalledWith(400);
      expect(json).toHaveBeenCalledWith({
        error: 'Validation failed',
        details: [
          {
            path: 'name',
            message: 'Expected string, received number',
          },
          {
            path: 'age',
            message: 'Expected number, received string',
          },
        ],
        requestId: 'test-request-id',
      });
      expect(logger.error).toHaveBeenCalled();
    });

    it('should include requestId in ZodError response', () => {
      const zodError = new ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          path: ['name'],
          message: 'Expected string, received number',
        },
      ]);

      mockReq.id = 'custom-request-id';

      (errorHandler as ErrorRequestHandler)(
        zodError,
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: 'custom-request-id',
        })
      );
    });
  });

  describe('generic Error handling', () => {
    it('should handle generic Error in development (includes stack trace)', () => {
      vi.mocked(env).NODE_ENV = 'development';

      const error = new Error('Something went wrong');
      error.stack = 'Error: Something went wrong\n    at test.js:1:1';

      (errorHandler as ErrorRequestHandler)(
        error,
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(status).toHaveBeenCalledWith(500);
      expect(json).toHaveBeenCalledWith({
        error: 'Internal Server Error',
        message: 'Something went wrong',
        stack: 'Error: Something went wrong\n    at test.js:1:1',
        requestId: 'test-request-id',
      });
      expect(logger.error).toHaveBeenCalledWith(
        {
          err: error,
          method: 'GET',
          path: '/api/v1/ethos/stats',
          requestId: 'test-request-id',
          ip: '127.0.0.1',
          userAgent: 'test-agent',
        },
        'Unhandled error'
      );
    });

    it('should handle generic Error in production (sanitized response)', () => {
      vi.mocked(env).NODE_ENV = 'production';

      const error = new Error('Something went wrong');
      error.stack = 'Error: Something went wrong\n    at test.js:1:1';

      (errorHandler as ErrorRequestHandler)(
        error,
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(status).toHaveBeenCalledWith(500);
      expect(json).toHaveBeenCalledWith({
        error: 'Internal Server Error',
        requestId: 'test-request-id',
      });
      // Should not include message or stack in production
      expect(json).not.toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.any(String),
          stack: expect.any(String),
        })
      );
      expect(logger.error).toHaveBeenCalled();
    });

    it('should log errors with full context', () => {
      vi.mocked(env).NODE_ENV = 'development';

      const error = new Error('Test error');
      mockReq.method = 'POST';
      mockReq.path = '/api/test';
      mockReq.id = 'log-test-id';
      mockReq.ip = '192.168.1.1';

      (errorHandler as ErrorRequestHandler)(
        error,
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(logger.error).toHaveBeenCalledWith(
        {
          err: error,
          method: 'POST',
          path: '/api/test',
          requestId: 'log-test-id',
          ip: '192.168.1.1',
          userAgent: 'test-agent',
        },
        'Unhandled error'
      );
    });
  });

  describe('non-Error object handling', () => {
    it('should handle non-Error objects', () => {
      vi.mocked(env).NODE_ENV = 'production';

      const stringError = 'String error';

      (errorHandler as ErrorRequestHandler)(
        stringError as unknown as Error,
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(status).toHaveBeenCalledWith(500);
      expect(json).toHaveBeenCalledWith({
        error: 'Internal Server Error',
        requestId: 'test-request-id',
      });
      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle null errors', () => {
      vi.mocked(env).NODE_ENV = 'production';

      (errorHandler as ErrorRequestHandler)(
        null as unknown as Error,
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(status).toHaveBeenCalledWith(500);
      expect(json).toHaveBeenCalledWith({
        error: 'Internal Server Error',
        requestId: 'test-request-id',
      });
    });

    it('should handle undefined errors', () => {
      vi.mocked(env).NODE_ENV = 'production';

      (errorHandler as ErrorRequestHandler)(
        undefined as unknown as Error,
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(status).toHaveBeenCalledWith(500);
      expect(json).toHaveBeenCalledWith({
        error: 'Internal Server Error',
        requestId: 'test-request-id',
      });
    });
  });

  describe('requestId handling', () => {
    it('should include requestId in all error responses', () => {
      vi.mocked(env).NODE_ENV = 'production';

      const error = new Error('Test error');
      mockReq.id = 'custom-id-123';

      (errorHandler as ErrorRequestHandler)(
        error,
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: 'custom-id-123',
        })
      );
    });

    it('should handle missing requestId gracefully', () => {
      vi.mocked(env).NODE_ENV = 'production';

      const error = new Error('Test error');
      delete mockReq.id;

      (errorHandler as ErrorRequestHandler)(
        error,
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(status).toHaveBeenCalledWith(500);
      expect(json).toHaveBeenCalled();
    });
  });

  describe('status code handling', () => {
    it('should return 500 for unknown errors', () => {
      vi.mocked(env).NODE_ENV = 'production';

      const error = new Error('Unknown error');

      (errorHandler as ErrorRequestHandler)(
        error,
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(status).toHaveBeenCalledWith(500);
    });

    it('should return 400 for ZodError', () => {
      const zodError = new ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          path: ['test'],
          message: 'Test error',
        },
      ]);

      (errorHandler as ErrorRequestHandler)(
        zodError,
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(status).toHaveBeenCalledWith(400);
    });
  });
});
