import { NextRequest, NextResponse } from 'next/server';

type RateLimitStore = Map<string, { count: number; resetTime: number }>;

// In-memory store for rate limiting (consider Redis for production)
const rateLimitStore: RateLimitStore = new Map();

interface RateLimitOptions {
  interval?: number; // Time window in milliseconds
  uniqueTokenPerInterval?: number; // Max number of unique tokens to track
  maxRequests?: number; // Max requests per interval
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

export class RateLimiter {
  private interval: number;
  private maxRequests: number;
  private store: RateLimitStore;

  constructor(options: RateLimitOptions = {}) {
    this.interval = options.interval || 60000; // Default: 1 minute
    this.maxRequests = options.maxRequests || 10; // Default: 10 requests
    this.store = rateLimitStore;
    
    // Clean up old entries periodically
    setInterval(() => this.cleanup(), this.interval);
  }

  private cleanup() {
    const now = Date.now();
    const entries = Array.from(this.store.entries());
    for (const [key, value] of entries) {
      if (value.resetTime <= now) {
        this.store.delete(key);
      }
    }
  }

  private getIdentifier(request: NextRequest): string {
    // Try to get IP from various headers (for proxied requests)
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ip = forwarded?.split(',')[0] || realIp || 'unknown';
    
    // You can also use user ID if authenticated
    const userId = request.headers.get('x-user-id');
    
    return userId || ip;
  }

  async check(request: NextRequest): Promise<RateLimitResult> {
    const identifier = this.getIdentifier(request);
    const now = Date.now();
    const resetTime = now + this.interval;

    let entry = this.store.get(identifier);

    if (!entry || entry.resetTime <= now) {
      // Create new entry or reset existing one
      entry = { count: 1, resetTime };
      this.store.set(identifier, entry);
      
      return {
        success: true,
        limit: this.maxRequests,
        remaining: this.maxRequests - 1,
        reset: resetTime,
      };
    }

    // Increment counter
    entry.count++;
    
    if (entry.count > this.maxRequests) {
      return {
        success: false,
        limit: this.maxRequests,
        remaining: 0,
        reset: entry.resetTime,
      };
    }

    return {
      success: true,
      limit: this.maxRequests,
      remaining: this.maxRequests - entry.count,
      reset: entry.resetTime,
    };
  }
}

// Pre-configured rate limiters for different endpoints
export const rateLimiters = {
  // Strict limit for public endpoints
  public: new RateLimiter({
    interval: 60000, // 1 minute
    maxRequests: 5,
  }),
  
  // Standard limit for authenticated API calls
  api: new RateLimiter({
    interval: 60000, // 1 minute
    maxRequests: 30,
  }),
  
  // Relaxed limit for read operations
  read: new RateLimiter({
    interval: 60000, // 1 minute
    maxRequests: 100,
  }),
  
  // Strict limit for write operations
  write: new RateLimiter({
    interval: 60000, // 1 minute
    maxRequests: 10,
  }),
  
  // Very strict limit for sensitive operations
  sensitive: new RateLimiter({
    interval: 300000, // 5 minutes
    maxRequests: 5,
  }),
};

// Helper function to create rate limit response
export function createRateLimitResponse(result: RateLimitResult): NextResponse {
  const response = new NextResponse(
    JSON.stringify({
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Please try again after ${new Date(result.reset).toISOString()}`,
      retryAfter: Math.ceil((result.reset - Date.now()) / 1000),
    }),
    { 
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'X-RateLimit-Limit': result.limit.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': new Date(result.reset).toISOString(),
        'Retry-After': Math.ceil((result.reset - Date.now()) / 1000).toString(),
      }
    }
  );
  
  return response;
}
