import winston from 'winston'
import * as Sentry from '@sentry/nextjs'

// Define log levels
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

// Define log categories for better organization
export enum LogCategory {
  AUTH = 'auth',
  ADMIN = 'admin', 
  SECURITY = 'security',
  API = 'api',
  DATABASE = 'database',
  RATE_LIMIT = 'rate_limit',
  SYSTEM = 'system'
}

// Structured log interface
interface LogData {
  message: string
  category: LogCategory
  userId?: string
  email?: string
  ipAddress?: string
  userAgent?: string
  siteId?: string
  endpoint?: string
  duration?: number
  error?: Error | string
  metadata?: Record<string, any>
}

// Create Winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
})

// Add file transport for production
if (process.env.NODE_ENV === 'production') {
  logger.add(new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error'
  }))
  logger.add(new winston.transports.File({
    filename: 'logs/combined.log'
  }))
}

// Structured logging functions
export const log = {
  error: (data: LogData) => {
    const logEntry = {
      level: LogLevel.ERROR,
      timestamp: new Date().toISOString(),
      category: data.category,
      message: data.message,
      userId: data.userId,
      email: data.email,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      siteId: data.siteId,
      endpoint: data.endpoint,
      error: data.error,
      metadata: data.metadata
    }
    
    logger.error(logEntry)
    
    // Send to Sentry for error tracking
    if (data.error instanceof Error) {
      Sentry.captureException(data.error, {
        tags: {
          category: data.category,
          userId: data.userId,
          endpoint: data.endpoint
        },
        extra: data.metadata
      })
    } else if (data.error) {
      Sentry.captureMessage(data.message, 'error')
    }
  },

  warn: (data: LogData) => {
    const logEntry = {
      level: LogLevel.WARN,
      timestamp: new Date().toISOString(),
      category: data.category,
      message: data.message,
      userId: data.userId,
      email: data.email,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      siteId: data.siteId,
      endpoint: data.endpoint,
      metadata: data.metadata
    }
    
    logger.warn(logEntry)
    
    // Send warnings about security events to Sentry
    if (data.category === LogCategory.SECURITY) {
      Sentry.captureMessage(data.message, 'warning')
    }
  },

  info: (data: LogData) => {
    const logEntry = {
      level: LogLevel.INFO,
      timestamp: new Date().toISOString(),
      category: data.category,
      message: data.message,
      userId: data.userId,
      email: data.email,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      siteId: data.siteId,
      endpoint: data.endpoint,
      duration: data.duration,
      metadata: data.metadata
    }
    
    logger.info(logEntry)
  },

  debug: (data: LogData) => {
    if (process.env.NODE_ENV === 'development') {
      const logEntry = {
        level: LogLevel.DEBUG,
        timestamp: new Date().toISOString(),
        category: data.category,
        message: data.message,
        userId: data.userId,
        endpoint: data.endpoint,
        metadata: data.metadata
      }
      
      logger.debug(logEntry)
    }
  }
}

// Security-specific logging helpers
export const logSecurity = {
  unauthorizedAccess: (userId: string, email: string, ipAddress: string, endpoint: string, siteName?: string) => {
    log.warn({
      message: `Unauthorized access attempt`,
      category: LogCategory.SECURITY,
      userId,
      email,
      ipAddress,
      endpoint,
      siteId: siteName,
      metadata: { action: 'unauthorized_access' }
    })
  },

  authSuccess: (userId: string, email: string, ipAddress: string, siteName: string) => {
    log.info({
      message: `Authentication successful`,
      category: LogCategory.AUTH,
      userId,
      email,
      ipAddress,
      siteId: siteName,
      metadata: { action: 'auth_success' }
    })
  },

  adminAction: (adminId: string, adminEmail: string, action: string, targetUserId?: string, targetEmail?: string) => {
    log.info({
      message: `Admin action: ${action}`,
      category: LogCategory.ADMIN,
      userId: adminId,
      email: adminEmail,
      metadata: { 
        action: 'admin_action',
        adminAction: action,
        targetUserId,
        targetEmail
      }
    })
  },

  rateLimitHit: (ipAddress: string, endpoint: string, limit: number) => {
    log.warn({
      message: `Rate limit exceeded`,
      category: LogCategory.RATE_LIMIT,
      ipAddress,
      endpoint,
      metadata: { 
        action: 'rate_limit_exceeded',
        limit 
      }
    })
  },

  suspiciousActivity: (userId: string, ipAddress: string, reason: string, metadata?: Record<string, any>) => {
    log.warn({
      message: `Suspicious activity detected: ${reason}`,
      category: LogCategory.SECURITY,
      userId,
      ipAddress,
      metadata: {
        action: 'suspicious_activity',
        reason,
        ...metadata
      }
    })
  }
}

// API performance logging
export const logApi = {
  request: (endpoint: string, method: string, userId?: string, ipAddress?: string) => {
    log.debug({
      message: `API request: ${method} ${endpoint}`,
      category: LogCategory.API,
      endpoint,
      userId,
      ipAddress,
      metadata: { method }
    })
  },

  response: (endpoint: string, method: string, statusCode: number, duration: number, userId?: string) => {
    const level = statusCode >= 500 ? LogLevel.ERROR : 
                 statusCode >= 400 ? LogLevel.WARN : 
                 LogLevel.INFO
    
    const logData: LogData = {
      message: `API response: ${method} ${endpoint} - ${statusCode}`,
      category: LogCategory.API,
      endpoint,
      userId,
      duration,
      metadata: { 
        method,
        statusCode,
        responseTime: `${duration}ms`
      }
    }

    if (level === LogLevel.ERROR) {
      log.error(logData)
    } else if (level === LogLevel.WARN) {
      log.warn(logData)
    } else {
      log.info(logData)
    }
  }
}

// Database operation logging
export const logDatabase = {
  query: (operation: string, table: string, duration: number, success: boolean, error?: Error) => {
    if (!success && error) {
      log.error({
        message: `Database ${operation} failed on ${table}`,
        category: LogCategory.DATABASE,
        duration,
        error,
        metadata: { operation, table }
      })
    } else {
      log.debug({
        message: `Database ${operation} on ${table}`,
        category: LogCategory.DATABASE,
        duration,
        metadata: { operation, table, success }
      })
    }
  }
}

export default log