import { NextResponse } from 'next/server'
import { monitoring } from '@/lib/monitoring'
import { logApi } from '@/lib/logger'

export async function GET(request: Request) {
  const startTime = Date.now()
  const { searchParams } = new URL(request.url)
  const detailed = searchParams.get('detailed') === 'true'
  
  try {
    if (detailed) {
      // Comprehensive health check
      const systemHealth = await monitoring.getSystemHealth()
      const performanceMetrics = monitoring.getPerformanceMetrics()
      const securitySummary = monitoring.getSecuritySummary()
      const businessMetrics = monitoring.getBusinessMetrics()
      const alerts = monitoring.checkAlerts()
      
      const responseTime = Date.now() - startTime
      
      // Record API performance
      monitoring.recordPerformance({
        endpoint: '/api/health',
        method: 'GET',
        statusCode: 200,
        responseTime,
        cacheHit: false,
        timestamp: new Date().toISOString()
      })
      
      logApi.response('/api/health', 'GET', 200, responseTime)
      
      return NextResponse.json({
        ...systemHealth,
        performance: performanceMetrics,
        security: securitySummary,
        business: {
          ...businessMetrics,
          uniqueIPs: businessMetrics.uniqueIPs.size // Convert Set to number
        },
        alerts,
        responseTime
      })
    } else {
      // Quick health check
      const responseTime = Date.now() - startTime
      
      monitoring.recordPerformance({
        endpoint: '/api/health',
        method: 'GET',
        statusCode: 200,
        responseTime,
        cacheHit: false,
        timestamp: new Date().toISOString()
      })
      
      return NextResponse.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
        },
        env: process.env.NODE_ENV,
        version: process.env.VERCEL_GIT_COMMIT_SHA || 'development',
        responseTime
      })
    }
  } catch (error) {
    const responseTime = Date.now() - startTime
    
    monitoring.recordPerformance({
      endpoint: '/api/health',
      method: 'GET',
      statusCode: 500,
      responseTime,
      cacheHit: false,
      timestamp: new Date().toISOString()
    })
    
    logApi.response('/api/health', 'GET', 500, responseTime)
    
    return NextResponse.json(
      { 
        status: 'unhealthy',
        error: 'Health check failed',
        timestamp: new Date().toISOString(),
        responseTime
      }, 
      { status: 500 }
    )
  }
}