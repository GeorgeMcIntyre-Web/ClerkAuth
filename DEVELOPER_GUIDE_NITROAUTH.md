# NitroAuth Developer Guide

## Overview

NitroAuth is a centralized authentication hub that provides secure, token-based authentication for multiple websites. This guide covers deployment, configuration, and administration.

## System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   External Site │───▶│   NitroAuth     │───▶│   Clerk Auth    │
│                 │    │                 │    │                 │
│  - Redirects    │    │ - Authorization │    │ - User Storage  │
│  - Validates    │    │ - Token Issue   │    │ - Sessions      │
│  - Grants Access│    │ - Admin Panel   │    │ - Security      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Core Components

### 1. Authentication Flow
- **Entry Point**: `/api/authorize` - Handles authorization requests from external sites
- **Validation**: `/api/validate` - Validates JWT tokens for external sites
- **Admin Panel**: `/admin` - User and site management interface

### 2. Security Layer
- **JWT Tokens**: HS256 algorithm, 1-hour expiration
- **Role-Based Access**: 5 user roles (Guest → Standard → Premium → Admin → Super Admin)
- **Input Validation**: Zod schemas for all API inputs
- **Rate Limiting**: Built-in protection against abuse

### 3. User Management
- **Clerk Integration**: Production-ready user authentication
- **Metadata Storage**: User roles and permissions stored in Clerk metadata
- **Real-time Updates**: Permission changes reflect immediately

## Installation & Setup

### Prerequisites
```bash
Node.js 18+
NPM or Yarn
Clerk Account (clerk.com)
Vercel Account (for deployment)
```

### Environment Variables
Create `.env.local`:
```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# JWT Security (CRITICAL - Generate secure key)
JWT_SECRET=your-super-secure-256-bit-secret-key-here

# Production URLs
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
```

### Installation Steps
```bash
# 1. Clone and install
git clone <repository>
cd nitroauth
npm install

# 2. Configure environment
cp .env.example .env.local
# Edit .env.local with your keys

# 3. Setup Clerk
# - Create project at clerk.com
# - Copy API keys to .env.local
# - Configure sign-in/sign-up URLs

# 4. Deploy to production
vercel --prod
# Or use your preferred deployment platform
```

## Configuration

### Clerk Setup
1. **Create Clerk Application**
   - Go to clerk.com
   - Create new application
   - Enable email/password authentication

2. **Configure URLs**
   - Sign-in URL: `https://your-domain.com/sign-in`
   - Sign-up URL: `https://your-domain.com/sign-up`
   - After sign-in: `https://your-domain.com/dashboard`

3. **Production Deployment**
   - Add production domain to Clerk
   - Update environment variables
   - Test authentication flow

### JWT Security
```bash
# Generate secure JWT secret (REQUIRED)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

⚠️ **CRITICAL**: Never use development JWT secrets in production!

## API Endpoints

### Authorization Endpoint
```http
POST /api/authorize
Content-Type: application/json

{
  "requestedSite": "sitename",
  "redirectUrl": "https://site.com/callback"
}
```

**Response (Success):**
```json
{
  "authorized": true,
  "redirectUrl": "https://site.com/callback?auth_token=JWT&user_id=ID&timestamp=TIME",
  "userRole": "premium",
  "siteAccess": ["premium_tools", "basic_tools"]
}
```

**Response (Denied):**
```json
{
  "authorized": false,
  "error": "Access denied for requested site"
}
```

### Token Validation Endpoint
```http
POST /api/validate
Content-Type: application/json

{
  "auth_token": "JWT_TOKEN",
  "user_id": "USER_ID"
}
```

**Response:**
```json
{
  "valid": true,
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "role": "premium",
    "siteAccess": ["premium_tools"],
    "firstName": "John",
    "lastName": "Doe"
  },
  "tokenData": {
    "timestamp": 1693567200000,
    "role": "premium"
  }
}
```

### Quick Validation (GET)
```http
GET /api/validate?auth_token=TOKEN&user_id=ID
```

## User Roles & Permissions

### Role Hierarchy
```
SUPER_ADMIN  → All sites + admin functions
    ↓
ADMIN        → Most sites (except super admin tools)
    ↓
PREMIUM      → Premium sites + standard sites
    ↓
STANDARD     → Standard sites only
    ↓
GUEST        → No default access (must be granted specific permissions)
```

### Permission System
- **Universal Access**: `all_sites`, `premium_sites`, `standard_sites`
- **Specific URLs**: Direct URL permissions (e.g., `https://example.com`)
- **Legacy Support**: Backward compatibility with old permission names

## Administration

### Initial Setup
1. **Deploy NitroAuth**
2. **Visit**: `https://your-nitroauth.com/api/admin/setup`
3. **First user becomes Super Admin**
4. **Configure additional users through admin panel**

### Admin Panel Features
- **User Management**: View all users, roles, permissions
- **Role Assignment**: Change user roles with audit logging
- **Site Management**: Add/remove sites, manage access
- **Permission Templates**: Quick access configurations
- **Security Monitoring**: View authentication logs

### Managing Sites
```javascript
// Add site through admin API
POST /api/admin/sites
{
  "name": "My Website",
  "url": "https://mysite.com",
  "description": "Company website",
  "category": "premium"
}
```

### Managing User Access
1. **Via Admin Panel**: Click "Manage Access" → Select permissions
2. **Via API**: POST to `/api/admin/users/update-access`
3. **Bulk Operations**: Import/export user permissions

## Security Considerations

### Production Checklist
- [ ] **Secure JWT Secret**: Generated with crypto.randomBytes(32)
- [ ] **HTTPS Only**: All communications encrypted
- [ ] **Environment Variables**: Secrets not in source code
- [ ] **Clerk Production Keys**: Development keys replaced
- [ ] **Rate Limiting**: Enabled on all endpoints
- [ ] **Input Validation**: All inputs sanitized
- [ ] **Logging**: Security events monitored

### Token Security
- **Expiration**: 1 hour maximum
- **Algorithm**: HS256 (HMAC SHA-256)
- **Validation**: Always server-side
- **Storage**: Secure cookies (HttpOnly, Secure, SameSite)

### Best Practices
- Regular security audits
- Monitor failed authentication attempts
- Log all admin actions
- Rotate JWT secrets periodically
- Use HTTPS everywhere

## Monitoring & Logging

### Security Events
All critical events are logged:
```
SECURITY EVENT: Super Admin created for user email@domain.com
ADMIN ACTION: Site "example.com" added by admin@domain.com
SECURITY: Unauthorized access attempt by user@domain.com for site: restricted.com
```

### Metrics to Monitor
- Authentication success/failure rates
- Token validation requests
- Admin panel access
- Failed authorization attempts
- User role changes

## Troubleshooting

### Common Issues

**JWT Verification Failed**
- Check JWT_SECRET is set correctly
- Verify token hasn't expired (1-hour limit)
- Ensure consistent secret across deployments

**User Not Authorized**
- Verify user has correct permissions in admin panel
- Check site name matches exactly
- Confirm user role allows site access

**Admin Setup Failed**
- Ensure first user gets Super Admin role
- Check Clerk API keys are correct
- Verify environment variables loaded

### Debug Mode
Enable verbose logging:
```env
NODE_ENV=development
DEBUG=nitroauth:*
```

## API Rate Limits

### Default Limits
- **Authorization**: 100 requests/minute per user
- **Validation**: 1000 requests/minute per site
- **Admin Actions**: 60 requests/minute per admin

### Custom Limits
Configure in environment:
```env
RATE_LIMIT_AUTH=100
RATE_LIMIT_VALIDATE=1000
RATE_LIMIT_ADMIN=60
```

## Backup & Recovery

### Data Backup
- **User Data**: Stored in Clerk (automatically backed up)
- **Permissions**: Export via admin panel
- **Site Configurations**: Version control recommended

### Disaster Recovery
- **JWT Secret**: Store securely, rotate regularly
- **Environment Variables**: Document all settings
- **Database**: If using external DB, implement backup strategy

## Performance Optimization

### Caching Strategy
- **Token Validation**: Cache valid tokens for 5 minutes
- **User Permissions**: Cache user data for 10 minutes
- **Site Configurations**: Cache indefinitely, invalidate on change

### Scalability
- **Horizontal Scaling**: Stateless design supports load balancing
- **CDN**: Static assets via CDN
- **Database**: Consider Redis for high-traffic scenarios

## Updates & Maintenance

### Version Updates
```bash
# Update dependencies
npm update

# Test in development
npm run dev

# Deploy to production
npm run build && vercel --prod
```

### Security Updates
- Monitor Clerk security advisories
- Update JWT library regularly
- Review and rotate secrets
- Security audit quarterly

## Support & Documentation

### Resources
- **API Documentation**: `/api/docs` (if implemented)
- **Integration Guide**: `UNIVERSAL_INTEGRATION.md`
- **Security Guide**: This document
- **GitHub Issues**: For bug reports and feature requests

### Getting Help
1. Check troubleshooting section
2. Review logs for error details
3. Verify configuration matches documentation
4. Contact support with specific error messages