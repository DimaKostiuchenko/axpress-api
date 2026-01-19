import type { Redis } from 'ioredis';
import { vi } from 'vitest';

/**
 * Creates a mock Redis client for testing
 */
export function createMockRedisClient(): {
  client: Redis;
  get: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
  setex: ReturnType<typeof vi.fn>;
  quit: ReturnType<typeof vi.fn>;
} {
  const get = vi.fn();
  const set = vi.fn();
  const setex = vi.fn();
  const quit = vi.fn();

  const client = {
    get,
    set,
    setex,
    quit,
    on: vi.fn(),
  } as unknown as Redis;

  return { client, get, set, setex, quit };
}

/**
 * Creates a mock logger for testing
 */
export function createMockLogger() {
  return {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  };
}

/**
 * Creates mock Express Request object
 */
export function createMockRequest(
  overrides: Partial<Request> = {}
): Partial<Request> {
  return {
    id: 'test-request-id',
    method: 'GET',
    path: '/api/v1/ethos/stats',
    query: {},
    params: {},
    body: {},
    headers: {},
    ip: '127.0.0.1',
    get: vi.fn((header: string) => {
      if (header === 'user-agent') return 'test-agent';
      return undefined;
    }),
    ...overrides,
  };
}

/**
 * Creates mock Express Response object
 */
export function createMockResponse(): {
  res: Partial<Response>;
  status: ReturnType<typeof vi.fn>;
  json: ReturnType<typeof vi.fn>;
  send: ReturnType<typeof vi.fn>;
} {
  const status = vi.fn().mockReturnThis();
  const json = vi.fn().mockReturnThis();
  const send = vi.fn().mockReturnThis();

  const res = {
    status,
    json,
    send,
    setHeader: vi.fn(),
    getHeader: vi.fn(),
  } as unknown as Partial<Response>;

  return { res, status, json, send };
}

/**
 * Creates mock Express NextFunction
 */
export function createMockNext(): ReturnType<typeof vi.fn> {
  return vi.fn();
}
