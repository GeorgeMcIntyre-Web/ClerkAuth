import { log, LogCategory } from './logger'
import * as Sentry from '@sentry/nextjs'

// Health check interfaces
export interface HealthCheck {
  name: string
  status: 'healthy' | 'unhealthy' | 'degraded'
  responseTime: number
  message?: string
  lastChecked: string
}

export interface SystemHealth {
  status: 'healthy' | 'unhealthy' | 'degraded'
  checks: HealthCheck[]
  uptime: number
  version: string
  timestamp: string
}

// Performance monitoring
export interface PerformanceMetrics {
  endpoint: string
  method: string
  statusCode: number
  responseTime: number
  timestamp: string
  userId?: string
  cacheHit?: boolean
}

// Security event monitoring
export interface SecurityEvent {
  type: 'auth_failure' | 'rate_limit_exceeded' | 'suspicious_activity' | 'admin_action'
  severity: 'low' | 'medium' | 'high' | 'critical'
  userId?: string
  ipAddress: string
  userAgent?: string
  details: Record<string, any>
  timestamp: string
}

// Business metrics
export interface BusinessMetrics {
  activeUsers: number
  authenticationAttempts: number
  successfulAuthentications: number
  failedAuthentications: number
  uniqueIPs: Set<string>
  topSites: Record<string, number>
  timestamp: string
}

class MonitoringService {
  private healthChecks: Map<string, HealthCheck> = new Map()
  private performanceBuffer: PerformanceMetrics[] = []
  private securityEvents: SecurityEvent[] = []
  private businessMetrics: BusinessMetrics = {
    activeUsers: 0,
    authenticationAttempts: 0,
    successfulAuthentications: 0,
    failedAuthentications: 0,
    uniqueIPs: new Set(),
    topSites: {},
    timestamp: new Date().toISOString()
  }

  // Health checks
  async checkDatabase(): Promise<HealthCheck> {
    const startTime = Date.now()
    const name = 'database'
    
    try {
      // Import db dynamically to avoid circular dependencies
      const { db } = await import('./db')
      
      // Simple query to check database connectivity
      await db().execute('SELECT 1')
      
      const responseTime = Date.now() - startTime
      const check: HealthCheck = {
        name,
        status: responseTime < 1000 ? 'healthy' : 'degraded',
        responseTime,
        message: responseTime < 1000 ? 'Database responsive' : 'Database slow response',
        lastChecked: new Date().toISOString()
      }
      
      this.healthChecks.set(name, check)
      return check
    } catch (error) {
      const responseTime = Date.now() - startTime
      const check: HealthCheck = {
        name,
        status: 'unhealthy',
        responseTime,
        message: 'Database connection failed',
        lastChecked: new Date().toISOString()
      }
      
      this.healthChecks.set(name, check)
      
      // Log critical database failure
      log.error({
        message: 'Database health check failed',
        category: LogCategory.DATABASE,
        error: error as Error,
        metadata: { healthCheck: name, responseTime }
      })
      
      return check
    }
  }

  async checkClerk(): Promise<HealthCheck> {
    const startTime = Date.now()
    const name = 'clerk'
    
    try {
      const { clerkClient } = await import('@clerk/nextjs/server')
      
      // Try to get user count - this tests Clerk API connectivity
      await clerkClient.users.getUserList({ limit: 1 })
      
      const responseTime = Date.now() - startTime
      const check: HealthCheck = {
        name,
        status: responseTime < 2000 ? 'healthy' : 'degraded',
        responseTime,
        message: responseTime < 2000 ? 'Clerk API responsive' : 'Clerk API slow response',
        lastChecked: new Date().toISOString()
      }
      
      this.healthChecks.set(name, check)
      return check
    } catch (error) {
      const responseTime = Date.now() - startTime
      const check: HealthCheck = {
        name,
        status: 'unhealthy',
        responseTime,
        message: 'Clerk API connection failed',
        lastChecked: new Date().toISOString()
      }
      
      this.healthChecks.set(name, check)
      
      // Log critical Clerk failure
      log.error({
        message: 'Clerk health check failed',
        category: LogCategory.AUTH,
        error: error as Error,
        metadata: { healthCheck: name, responseTime }
      })
      
      return check
    }
  }

  async checkCache(): Promise<HealthCheck> {
    const startTime = Date.now()
    const name = 'cache'
    
    try {
      const { cache } = await import('./cache')
      
      // Test cache with a simple write/read
      const testKey = `health_check_${Date.now()}`
      const testValue = 'ok'
      
      await cache.setSystemConfig(testKey, testValue)
      const retrieved = await cache.getSystemConfig(testKey)
      
      const responseTime = Date.now() - startTime
      const isWorking = retrieved === testValue
      
      const check: HealthCheck = {
        name,
        status: isWorking ? (responseTime < 500 ? 'healthy' : 'degraded') : 'unhealthy',
        responseTime,
        message: isWorking ? 'Cache operational' : 'Cache read/write failed',
        lastChecked: new Date().toISOString()
      }
      
      this.healthChecks.set(name, check)
      return check
    } catch (error) {
      const responseTime = Date.now() - startTime
      const check: HealthCheck = {
        name,
        status: 'degraded', // Cache failures are not critical
        responseTime,
        message: 'Cache unavailable (fallback mode)',
        lastChecked: new Date().toISOString()
      }
      
      this.healthChecks.set(name, check)
      
      log.warn({
        message: 'Cache health check failed',
        category: LogCategory.SYSTEM,
        error: error as Error,
        metadata: { healthCheck: name, responseTime }
      })
      
      return check
    }
  }

  async getSystemHealth(): Promise<SystemHealth> {
    const checks = await Promise.all([
      this.checkDatabase(),
      this.checkClerk(),
      this.checkCache()
    ])
    
    // Determine overall system status
    const hasUnhealthy = checks.some(check => check.status === 'unhealthy')
    const hasDegraded = checks.some(check => check.status === 'degraded')
    
    const status = hasUnhealthy ? 'unhealthy' : (hasDegraded ? 'degraded' : 'healthy')
    
    const systemHealth: SystemHealth = {
      status,
      checks,
      uptime: process.uptime(),
      version: process.env.VERCEL_GIT_COMMIT_SHA || 'development',
      timestamp: new Date().toISOString()
    }
    
    // Log health check results
    log.info({
      message: `System health check: ${status}`,
      category: LogCategory.SYSTEM,
      metadata: { 
        status, 
        checksCount: checks.length,
        unhealthyCount: checks.filter(c => c.status === 'unhealthy').length,
        degradedCount: checks.filter(c => c.status === 'degraded').length
      }
    })
    
    // Send critical alerts to Sentry
    if (status === 'unhealthy') {
      Sentry.captureMessage(`System unhealthy: ${checks.filter(c => c.status === 'unhealthy').map(c => c.name).join(', ')}`, 'error')
    }
    
    return systemHealth
  }

  // Performance monitoring
  recordPerformance(metrics: PerformanceMetrics) {
    this.performanceBuffer.push({
      ...metrics,
      timestamp: new Date().toISOString()
    })
    
    // Keep buffer size manageable
    if (this.performanceBuffer.length > 1000) {
      this.performanceBuffer = this.performanceBuffer.slice(-500)
    }
    
    // Log slow responses
    if (metrics.responseTime > 5000) {
      log.warn({
        message: `Slow API response: ${metrics.method} ${metrics.endpoint}`,
        category: LogCategory.API,
        endpoint: metrics.endpoint,
        duration: metrics.responseTime,
        userId: metrics.userId,
        metadata: { 
          statusCode: metrics.statusCode,
          cacheHit: metrics.cacheHit
        }
      })
    }
    
    // Update business metrics
    if (metrics.endpoint === '/api/auth/authorize' && metrics.statusCode === 200) {
      this.businessMetrics.successfulAuthentications++
    }
    
    if (metrics.endpoint === '/api/auth/authorize') {
      this.businessMetrics.authenticationAttempts++
      if (metrics.statusCode !== 200) {
        this.businessMetrics.failedAuthentications++
      }
    }
  }

  // Security event monitoring
  recordSecurityEvent(event: SecurityEvent) {
    const securityEvent = {
      ...event,
      timestamp: new Date().toISOString()
    }
    
    this.securityEvents.push(securityEvent)
    
    // Keep buffer size manageable
    if (this.securityEvents.length > 500) {
      this.securityEvents = this.securityEvents.slice(-250)
    }
    
    // Log security events
    log.warn({
      message: `Security event: ${event.type}`,
      category: LogCategory.SECURITY,
      userId: event.userId,
      ipAddress: event.ipAddress,
      metadata: {
        type: event.type,
        severity: event.severity,
        details: event.details
      }
    })
    
    // Send high severity events to Sentry
    if (event.severity === 'high' || event.severity === 'critical') {
      Sentry.captureMessage(`Security event: ${event.type}`, event.severity === 'critical' ? 'error' : 'warning')
    }
    
    // Update business metrics
    this.businessMetrics.uniqueIPs.add(event.ipAddress)
  }

  // Metrics aggregation
  getPerformanceMetrics(minutes: number = 60): {
    avgResponseTime: number
    requestCount: number
    errorRate: number
    slowRequestCount: number
  } {
    const cutoff = Date.now() - (minutes * 60 * 1000)
    const recentMetrics = this.performanceBuffer.filter(
      m => new Date(m.timestamp).getTime() > cutoff
    )
    
    if (recentMetrics.length === 0) {
      return { avgResponseTime: 0, requestCount: 0, errorRate: 0, slowRequestCount: 0 }
    }
    
    const avgResponseTime = recentMetrics.reduce((sum, m) => sum + m.responseTime, 0) / recentMetrics.length
    const errorCount = recentMetrics.filter(m => m.statusCode >= 400).length
    const slowRequestCount = recentMetrics.filter(m => m.responseTime > 2000).length
    
    return {
      avgResponseTime: Math.round(avgResponseTime),
      requestCount: recentMetrics.length,
      errorRate: Math.round((errorCount / recentMetrics.length) * 100),
      slowRequestCount
    }
  }

  getSecuritySummary(hours: number = 24): {
    totalEvents: number
    criticalEvents: number
    uniqueIPs: number
    topEventTypes: Record<string, number>
  } {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000)
    const recentEvents = this.securityEvents.filter(
      e => new Date(e.timestamp).getTime() > cutoff
    )
    
    const topEventTypes = recentEvents.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    return {
      totalEvents: recentEvents.length,
      criticalEvents: recentEvents.filter(e => e.severity === 'critical' || e.severity === 'high').length,
      uniqueIPs: new Set(recentEvents.map(e => e.ipAddress)).size,
      topEventTypes
    }
  }

  getBusinessMetrics(): BusinessMetrics {
    return {
      ...this.businessMetrics,
      uniqueIPs: new Set(this.businessMetrics.uniqueIPs), // Clone the Set
      timestamp: new Date().toISOString()
    }
  }

  // Alert thresholds
  checkAlerts(): {
    alerts: Array<{
      type: string
      severity: 'low' | 'medium' | 'high' | 'critical'
      message: string
      value: number
      threshold: number
    }>
  } {
    const alerts = []
    const performanceMetrics = this.getPerformanceMetrics()
    const securitySummary = this.getSecuritySummary()
    
    // Performance alerts
    if (performanceMetrics.avgResponseTime > 3000) {
      alerts.push({
        type: 'high_response_time',
        severity: (performanceMetrics.avgResponseTime > 5000 ? 'critical' : 'high') as 'critical' | 'high',
        message: `Average response time is ${performanceMetrics.avgResponseTime}ms`,
        value: performanceMetrics.avgResponseTime,
        threshold: 3000
      })
    }
    
    if (performanceMetrics.errorRate > 10) {
      alerts.push({
        type: 'high_error_rate',
        severity: (performanceMetrics.errorRate > 25 ? 'critical' : 'high') as 'critical' | 'high',
        message: `Error rate is ${performanceMetrics.errorRate}%`,
        value: performanceMetrics.errorRate,
        threshold: 10
      })
    }
    
    // Security alerts
    if (securitySummary.criticalEvents > 5) {
      alerts.push({
        type: 'security_events',
        severity: 'critical' as 'critical',
        message: `${securitySummary.criticalEvents} critical security events in the last 24 hours`,
        value: securitySummary.criticalEvents,
        threshold: 5
      })
    }
    
    // Business metric alerts
    const failureRate = this.businessMetrics.authenticationAttempts > 0 
      ? (this.businessMetrics.failedAuthentications / this.businessMetrics.authenticationAttempts) * 100 
      : 0
      
    if (failureRate > 50) {
      alerts.push({
        type: 'auth_failure_rate',
        severity: 'high' as 'high',
        message: `Authentication failure rate is ${Math.round(failureRate)}%`,
        value: Math.round(failureRate),
        threshold: 50
      })
    }
    
    return { alerts }
  }
}

export const monitoring = new MonitoringService()
export default monitoring