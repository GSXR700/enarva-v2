// lib/rate-limit.ts - FIXED VERSION
import { NextRequest } from 'next/server';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

setInterval(() => {
  const now = Date.now();
  const keysToDelete: string[] = [];
  
  rateLimitStore.forEach((entry, key) => {
    if (now > entry.resetTime) {
      keysToDelete.push(key);
    }
  });
  
  keysToDelete.forEach(key => rateLimitStore.delete(key));
}, 5 * 60 * 1000);

interface RateLimitOptions {
  maxRequests?: number;
  windowMs?: number;
  keyGenerator?: (request: NextRequest) => string;
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  current: number;
  remaining: number;
  resetTime: number;
}

export async function applyRateLimit(
  request: NextRequest,
  options: RateLimitOptions = {}
): Promise<RateLimitResult> {
  const {
    maxRequests = 100,
    windowMs = 60 * 60 * 1000,
    keyGenerator = (req) => getClientIP(req) || 'anonymous'
  } = options;

  const key = keyGenerator(request);
  const now = Date.now();
  const resetTime = now + windowMs;

  let entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetTime) {
    entry = {
      count: 1,
      resetTime
    };
    rateLimitStore.set(key, entry);

    return {
      success: true,
      limit: maxRequests,
      current: 1,
      remaining: maxRequests - 1,
      resetTime
    };
  }

  entry.count++;

  if (entry.count > maxRequests) {
    return {
      success: false,
      limit: maxRequests,
      current: entry.count,
      remaining: 0,
      resetTime: entry.resetTime
    };
  }

  return {
    success: true,
    limit: maxRequests,
    current: entry.count,
    remaining: maxRequests - entry.count,
    resetTime: entry.resetTime
  };
}

function getClientIP(request: NextRequest): string | null {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP.trim();
  }

  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  if (cfConnectingIP) {
    return cfConnectingIP.trim();
  }

  return null;
}

export function createRateLimiter(maxRequests: number = 50, windowMs: number = 60 * 1000) {
  return async (request: NextRequest) => {
    return applyRateLimit(request, { maxRequests, windowMs });
  };
}

export const strictRateLimit = createRateLimiter(5, 15 * 60 * 1000);
export const standardRateLimit = createRateLimiter(100, 60 * 60 * 1000);
export const lenientRateLimit = createRateLimiter(500, 60 * 60 * 1000);