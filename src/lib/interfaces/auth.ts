export interface IRateLimitBucket {
  count: number;
  resetAt: number;
}

export interface IRateLimitOptions {
  maxAttempts: number;
  windowMs: number;
}

export interface IContentSecurityPolicyOptions {
  nonce: string;
  supabaseUrl: string;
  isDevelopment: boolean;
}
