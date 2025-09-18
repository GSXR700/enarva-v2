// lib/rate-limit.ts - DEFINITIVE SOLUTION MATCHING REPO PATTERNS
import { NextRequest } from 'next/server';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup expired entries every 5 minutes
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
    windowMs = 60 * 60 * 1000, // 1 hour
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

// Simple, bulletproof IP extraction that works with your strict TS config
function getClientIP(request: NextRequest): string | null {
  // Use the same pattern as your existing codebase - null coalescing
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    // Split and get first IP, handle the strict typing the same way as your validation.ts
    const firstIP = forwarded.split(',').at(0)?.trim();
    if (firstIP) return firstIP;
  }

  const realIP = request.headers.get('x-real-ip');
  if (realIP) return realIP.trim();

  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  if (cfConnectingIP) return cfConnectingIP.trim();

  return null;
}

// Export rate limiters with different configurations
export function createRateLimiter(maxRequests: number = 50, windowMs: number = 60 * 1000) {
  return async (request: NextRequest) => {
    return applyRateLimit(request, { maxRequests, windowMs });
  };
}

// Pre-configured rate limiters matching your app patterns
export const strictRateLimit = createRateLimiter(5, 15 * 60 * 1000); // 5 requests per 15 min
export const standardRateLimit = createRateLimiter(100, 60 * 60 * 1000); // 100 requests per hour
export const lenientRateLimit = createRateLimiter(500, 60 * 60 * 1000); // 500 requests per hour