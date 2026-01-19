import type { NextFunction, Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { validate } from '../../../src/middlewares/validation.js';
import {
  createMockNext,
  createMockRequest,
  createMockResponse,
} from '../../helpers/mocks.js';

describe('Validation Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let status: ReturnType<typeof vi.fn>;
  let json: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    const request = createMockRequest();
    const { res, status: resStatus, json: resJson } = createMockResponse();
    mockReq = request as unknown as Partial<Request>;
    mockRes = res as unknown as Partial<Response>;
    status = resStatus;
    json = resJson;
    mockNext = createMockNext() as NextFunction;
    vi.clearAllMocks();
  });

  describe('query parameter validation', () => {
    it('should validate query parameters successfully', () => {
      const schema = {
        query: z.object({
          page: z.string(),
        }),
      };

      mockReq.query = { page: '1' };

      validate(schema)(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith();
      expect(json).not.toHaveBeenCalled();
      expect(status).not.toHaveBeenCalled();
    });

    it('should reject invalid query parameters with 400 and error details', () => {
      const schema = {
        query: z.object({
          page: z.string(),
        }),
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockReq.query = { page: 123 } as any; // Wrong type - intentionally invalid for testing

      validate(schema)(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(status).toHaveBeenCalledWith(400);
      expect(json).toHaveBeenCalledWith({
        error: 'Validation failed',
        details: expect.arrayContaining([
          expect.objectContaining({
            path: 'page',
            message: expect.any(String),
          }),
        ]),
        requestId: 'test-request-id',
      });
    });

    it('should handle multiple validation errors', () => {
      const schema = {
        query: z.object({
          page: z.string(),
          limit: z.string(),
        }),
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockReq.query = { page: 123, limit: 456 } as any; // Wrong types - intentionally invalid for testing

      validate(schema)(mockReq as Request, mockRes as Response, mockNext);

      expect(status).toHaveBeenCalledWith(400);
      expect(json).toHaveBeenCalledWith({
        error: 'Validation failed',
        details: expect.arrayContaining([
          expect.objectContaining({ path: 'page' }),
          expect.objectContaining({ path: 'limit' }),
        ]),
        requestId: 'test-request-id',
      });
    });

    it('should include requestId in error response', () => {
      const schema = {
        query: z.object({
          page: z.string(),
        }),
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockReq.query = { page: 123 } as any; // Wrong type - intentionally invalid for testing
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockReq as any).id = 'custom-request-id';

      validate(schema)(mockReq as Request, mockRes as Response, mockNext);

      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: 'custom-request-id',
        })
      );
    });
  });

  describe('route parameter validation', () => {
    it('should validate route parameters successfully', () => {
      const schema = {
        params: z.object({
          id: z.string().uuid(),
        }),
      };

      mockReq.params = { id: '123e4567-e89b-12d3-a456-426614174000' };

      validate(schema)(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(json).not.toHaveBeenCalled();
    });

    it('should reject invalid route parameters with 400 and error details', () => {
      const schema = {
        params: z.object({
          id: z.string().uuid(),
        }),
      };

      mockReq.params = { id: 'not-a-uuid' };

      validate(schema)(mockReq as Request, mockRes as Response, mockNext);

      expect(status).toHaveBeenCalledWith(400);
      expect(json).toHaveBeenCalledWith({
        error: 'Validation failed',
        details: expect.arrayContaining([
          expect.objectContaining({
            path: 'id',
            message: expect.any(String),
          }),
        ]),
        requestId: 'test-request-id',
      });
    });
  });

  describe('request body validation', () => {
    it('should validate request body successfully', () => {
      const schema = {
        body: z.object({
          name: z.string(),
          age: z.number(),
        }),
      };

      mockReq.body = { name: 'John', age: 30 };

      validate(schema)(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(json).not.toHaveBeenCalled();
    });

    it('should reject invalid request body with 400 and error details', () => {
      const schema = {
        body: z.object({
          name: z.string(),
          age: z.number(),
        }),
      };

      mockReq.body = { name: 'John', age: 'not-a-number' };

      validate(schema)(mockReq as Request, mockRes as Response, mockNext);

      expect(status).toHaveBeenCalledWith(400);
      expect(json).toHaveBeenCalledWith({
        error: 'Validation failed',
        details: expect.arrayContaining([
          expect.objectContaining({
            path: 'age',
            message: expect.any(String),
          }),
        ]),
        requestId: 'test-request-id',
      });
    });
  });

  describe('combined validation', () => {
    it('should validate query, params, and body together', () => {
      const schema = {
        query: z.object({ page: z.string() }),
        params: z.object({ id: z.string() }),
        body: z.object({ name: z.string() }),
      };

      mockReq.query = { page: '1' };
      mockReq.params = { id: '123' };
      mockReq.body = { name: 'John' };

      validate(schema)(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(json).not.toHaveBeenCalled();
    });

    it('should fail if any part of combined validation fails', () => {
      const schema = {
        query: z.object({ page: z.string() }),
        params: z.object({ id: z.string() }),
        body: z.object({ name: z.string() }),
      };

      mockReq.query = { page: '1' };
      mockReq.params = { id: '123' };
      mockReq.body = { name: 123 }; // Invalid

      validate(schema)(mockReq as Request, mockRes as Response, mockNext);

      expect(status).toHaveBeenCalledWith(400);
      expect(json).toHaveBeenCalled();
    });
  });

  describe('optional validation', () => {
    it('should work when only query is provided', () => {
      const schema = {
        query: z.object({ page: z.string() }),
      };

      mockReq.query = { page: '1' };

      validate(schema)(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should work when only params is provided', () => {
      const schema = {
        params: z.object({ id: z.string() }),
      };

      mockReq.params = { id: '123' };

      validate(schema)(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should work when only body is provided', () => {
      const schema = {
        body: z.object({ name: z.string() }),
      };

      mockReq.body = { name: 'John' };

      validate(schema)(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
    });
  });

  describe('error handling', () => {
    it('should pass non-Zod errors to next middleware', () => {
      // Create a schema that will throw a non-Zod error by using a custom refinement
      const customSchema = z.object({ page: z.string() }).superRefine(() => {
        throw new Error('Non-Zod error');
      });

      mockReq.query = { page: '1' };

      // Use a schema that throws a non-Zod error
      const validateWithCustomSchema = validate({ query: customSchema });
      validateWithCustomSchema(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(json).not.toHaveBeenCalled();
    });

    it('should call next() when validation passes', () => {
      const schema = {
        query: z.object({}).strict(),
      };

      mockReq.query = {};

      validate(schema)(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('strict validation', () => {
    it('should reject unknown query parameters with strict schema', () => {
      const schema = {
        query: z.object({}).strict(),
      };

      mockReq.query = { unknown: 'param' };

      validate(schema)(mockReq as Request, mockRes as Response, mockNext);

      expect(status).toHaveBeenCalledWith(400);
      expect(json).toHaveBeenCalledWith({
        error: 'Validation failed',
        details: expect.arrayContaining([
          expect.objectContaining({
            path: 'unknown',
            message: expect.stringContaining('Unrecognized key'),
          }),
        ]),
        requestId: 'test-request-id',
      });
    });
  });
});
