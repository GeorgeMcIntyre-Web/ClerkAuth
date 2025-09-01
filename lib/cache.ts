import { kv } from '@vercel/kv'
import { log, LogCategory } from '@/lib/logger'

export interface CacheConfig {
  ttl: number // Time to live in seconds
  keyPrefix: string
}

export const cacheConfigs = {
  userValidation: { ttl: 300, keyPrefix: 'user:validation' }, // 5 minutes
  userPermissions: { ttl: 600, keyPrefix: 'user:permissions' }, // 10 minutes
  siteConfig: { ttl: 1800, keyPrefix: 'site:config' }, // 30 minutes
  systemConfig: { ttl: 3600, keyPrefix: 'system:config' }, // 1 hour
} as const

// Generic cache interface for flexibility
interface CacheAdapter {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T, ttl: number): Promise<void>
  del(key: string): Promise<void>
  exists(key: string): Promise<boolean>
}

// Vercel KV adapter (production)
class VercelKVAdapter implements CacheAdapter {
  async get<T>(key: string): Promise<T | null> {
    try {
      const result = await kv.get<T>(key)
      
      log.debug({
        message: `Cache GET: ${key}`,
        category: LogCategory.SYSTEM,
        metadata: { cacheHit: result !== null, key }
      })
      
      return result
    } catch (error) {
      log.error({
        message: `Cache GET error: ${key}`,
        category: LogCategory.SYSTEM,
        error: error as Error,
        metadata: { key }
      })
      return null
    }
  }

  async set<T>(key: string, value: T, ttl: number): Promise<void> {
    try {
      await kv.set(key, value, { ex: ttl })
      
      log.debug({
        message: `Cache SET: ${key}`,
        category: LogCategory.SYSTEM,
        metadata: { key, ttl }
      })
    } catch (error) {
      log.error({
        message: `Cache SET error: ${key}`,
        category: LogCategory.SYSTEM,
        error: error as Error,
        metadata: { key, ttl }
      })
    }
  }

  async del(key: string): Promise<void> {
    try {
      await kv.del(key)
      
      log.debug({
        message: `Cache DEL: ${key}`,
        category: LogCategory.SYSTEM,
        metadata: { key }
      })
    } catch (error) {
      log.error({
        message: `Cache DEL error: ${key}`,
        category: LogCategory.SYSTEM,
        error: error as Error,
        metadata: { key }
      })
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      return await kv.exists(key) > 0
    } catch (error) {
      log.error({
        message: `Cache EXISTS error: ${key}`,
        category: LogCategory.SYSTEM,
        error: error as Error,
        metadata: { key }
      })
      return false
    }
  }
}

// In-memory adapter (development/fallback)
class MemoryAdapter implements CacheAdapter {
  private cache = new Map<string, { value: any; expires: number }>()
  
  async get<T>(key: string): Promise<T | null> {
    const item = this.cache.get(key)
    if (!item) return null
    
    if (Date.now() > item.expires) {
      this.cache.delete(key)
      return null
    }
    
    log.debug({
      message: `Memory cache GET: ${key}`,
      category: LogCategory.SYSTEM,
      metadata: { cacheHit: true, key }
    })
    
    return item.value as T
  }

  async set<T>(key: string, value: T, ttl: number): Promise<void> {
    const expires = Date.now() + (ttl * 1000)
    this.cache.set(key, { value, expires })
    
    log.debug({
      message: `Memory cache SET: ${key}`,
      category: LogCategory.SYSTEM,
      metadata: { key, ttl }
    })
  }

  async del(key: string): Promise<void> {
    this.cache.delete(key)
    
    log.debug({
      message: `Memory cache DEL: ${key}`,
      category: LogCategory.SYSTEM,
      metadata: { key }
    })
  }

  async exists(key: string): Promise<boolean> {
    return this.cache.has(key) && Date.now() <= this.cache.get(key)!.expires
  }
}

// Cache instance selection based on environment
const createCacheAdapter = (): CacheAdapter => {
  // Use Vercel KV in production if available
  if (process.env.NODE_ENV === 'production' && process.env.KV_REST_API_URL) {
    return new VercelKVAdapter()
  }
  
  // Fallback to memory cache for development
  return new MemoryAdapter()
}

const cacheAdapter = createCacheAdapter()

// High-level cache functions
export const cache = {
  // User validation caching (most critical for performance)
  async getUserValidation(userId: string) {
    const key = `${cacheConfigs.userValidation.keyPrefix}:${userId}`
    return await cacheAdapter.get<{
      valid: boolean
      role: string
      siteAccess: string[]
      permissions: Record<string, boolean>
      timestamp: number
    }>(key)
  },

  async setUserValidation(
    userId: string, 
    data: {
      valid: boolean
      role: string
      siteAccess: string[]
      permissions: Record<string, boolean>
      timestamp: number
    }
  ) {
    const key = `${cacheConfigs.userValidation.keyPrefix}:${userId}`
    await cacheAdapter.set(key, data, cacheConfigs.userValidation.ttl)
  },

  // User permissions caching
  async getUserPermissions(userId: string, siteId: string) {
    const key = `${cacheConfigs.userPermissions.keyPrefix}:${userId}:${siteId}`
    return await cacheAdapter.get<Record<string, boolean>>(key)
  },

  async setUserPermissions(userId: string, siteId: string, permissions: Record<string, boolean>) {
    const key = `${cacheConfigs.userPermissions.keyPrefix}:${userId}:${siteId}`
    await cacheAdapter.set(key, permissions, cacheConfigs.userPermissions.ttl)
  },

  // Site configuration caching
  async getSiteConfig(siteId: string) {
    const key = `${cacheConfigs.siteConfig.keyPrefix}:${siteId}`
    return await cacheAdapter.get<{
      id: string
      name: string
      url: string
      category: string
      isActive: boolean
    }>(key)
  },

  async setSiteConfig(siteId: string, config: any) {
    const key = `${cacheConfigs.siteConfig.keyPrefix}:${siteId}`
    await cacheAdapter.set(key, config, cacheConfigs.siteConfig.ttl)
  },

  // System configuration caching
  async getSystemConfig(configKey: string) {
    const key = `${cacheConfigs.systemConfig.keyPrefix}:${configKey}`
    return await cacheAdapter.get<string>(key)
  },

  async setSystemConfig(configKey: string, value: string) {
    const key = `${cacheConfigs.systemConfig.keyPrefix}:${configKey}`
    await cacheAdapter.set(key, value, cacheConfigs.systemConfig.ttl)
  },

  // Cache invalidation helpers
  async invalidateUser(userId: string) {
    const validationKey = `${cacheConfigs.userValidation.keyPrefix}:${userId}`
    await cacheAdapter.del(validationKey)
    
    log.info({
      message: `Cache invalidated for user: ${userId}`,
      category: LogCategory.SYSTEM,
      userId,
      metadata: { action: 'cache_invalidation', target: 'user' }
    })
  },

  async invalidateUserPermissions(userId: string, siteId?: string) {
    if (siteId) {
      const key = `${cacheConfigs.userPermissions.keyPrefix}:${userId}:${siteId}`
      await cacheAdapter.del(key)
    }
    // Note: For full user permission invalidation across all sites,
    // we'd need a more sophisticated pattern matching system
    
    log.info({
      message: `Cache invalidated for user permissions: ${userId}${siteId ? ` (site: ${siteId})` : ''}`,
      category: LogCategory.SYSTEM,
      userId,
      metadata: { action: 'cache_invalidation', target: 'user_permissions', siteId }
    })
  },

  async invalidateSite(siteId: string) {
    const key = `${cacheConfigs.siteConfig.keyPrefix}:${siteId}`
    await cacheAdapter.del(key)
    
    log.info({
      message: `Cache invalidated for site: ${siteId}`,
      category: LogCategory.SYSTEM,
      metadata: { action: 'cache_invalidation', target: 'site', siteId }
    })
  }
}

// Performance monitoring wrapper
export async function withCache<T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
  ttl: number,
  category: string = 'general'
): Promise<T> {
  const startTime = Date.now()
  
  // Try cache first
  const cached = await cacheAdapter.get<T>(cacheKey)
  if (cached !== null) {
    const duration = Date.now() - startTime
    
    log.debug({
      message: `Cache hit: ${cacheKey}`,
      category: LogCategory.SYSTEM,
      duration,
      metadata: { 
        cacheHit: true, 
        key: cacheKey,
        category 
      }
    })
    
    return cached
  }
  
  // Fetch fresh data
  const data = await fetcher()
  const fetchDuration = Date.now() - startTime
  
  // Cache the result
  await cacheAdapter.set(cacheKey, data, ttl)
  
  log.debug({
    message: `Cache miss and set: ${cacheKey}`,
    category: LogCategory.SYSTEM,
    duration: fetchDuration,
    metadata: { 
      cacheHit: false, 
      key: cacheKey,
      category,
      ttl 
    }
  })
  
  return data
}

export default cache