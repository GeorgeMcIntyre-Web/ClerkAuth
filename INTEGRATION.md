# NitroAuth Integration Guide

## Overview

NitroAuth provides centralized authentication for external sites. Users authenticate once on NitroAuth and are redirected to authorized sites with secure tokens.

## Integration Flow

### 1. Redirect to NitroAuth

When a user needs authentication, redirect them to:

```
https://nitroauth.com/authorize?site=SITE_NAME&redirect_url=YOUR_CALLBACK_URL
```

Parameters:
- `site`: Your site identifier (e.g., "houseatreides", "dashboard", "analytics")
- `redirect_url`: Where users should be redirected after authorization

### 2. Handle the Callback

Users will be redirected back to your `redirect_url` with these parameters:

```
https://yoursite.com/callback?auth_token=JWT_TOKEN&user_id=USER_ID&timestamp=TIMESTAMP
```

### 3. Validate the Token

Make a server-side request to validate the token:

```javascript
// POST request to validate token
const response = await fetch('https://nitroauth.com/api/validate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    auth_token: token,
    user_id: userId
  })
});

const result = await response.json();

if (result.valid) {
  // User is authenticated
  const user = result.user;
  console.log('Authenticated user:', user.email);
  console.log('User role:', user.role);
  console.log('Site permissions:', user.siteAccess);
} else {
  // Authentication failed
  console.error('Auth failed:', result.error);
}
```

### 4. Quick Token Check (Optional)

For quick validation without full user data:

```javascript
// GET request for quick validation
const response = await fetch(`https://nitroauth.com/api/validate?auth_token=${token}&user_id=${userId}`);
const result = await response.json();

if (result.valid) {
  console.log('Token valid, user role:', result.role);
}
```

## Site Permission Mapping

Your site identifier maps to required permissions:

- `houseatreides` → Requires PREMIUM_CONTENT + MAIN_DASHBOARD
- `dashboard` → Requires MAIN_DASHBOARD
- `analytics` → Requires ANALYTICS
- `crm` → Requires CRM
- `inventory` → Requires INVENTORY
- `billing` → Requires BILLING
- `reports` → Requires REPORTS
- `api` → Requires API_ACCESS
- `premium` → Requires PREMIUM_CONTENT
- `support` → Requires SUPPORT_TOOLS

Unknown sites default to requiring MAIN_DASHBOARD permission.

## Security Best Practices

1. **Always validate tokens server-side** - Never trust client-side validation
2. **Check token expiry** - Tokens expire after 1 hour
3. **Use HTTPS only** - Never send tokens over HTTP
4. **Store tokens securely** - Use secure cookies or server sessions
5. **Log security events** - Monitor for suspicious activity

## User Roles

- `SUPER_ADMIN` - Full access to everything
- `ADMIN` - Access to most sites (except super admin tools)
- `PREMIUM` - Access to premium content and standard features
- `STANDARD` - Basic site access
- `GUEST` - Limited access

## Example Implementation

```javascript
// middleware.js - Example Next.js middleware
import { NextResponse } from 'next/server';

export async function middleware(request) {
  const token = request.cookies.get('auth_token')?.value;
  const userId = request.cookies.get('user_id')?.value;
  
  if (!token || !userId) {
    // Redirect to NitroAuth
    const authUrl = `https://nitroauth.com/authorize?site=houseatreides&redirect_url=${encodeURIComponent(request.url)}`;
    return NextResponse.redirect(authUrl);
  }
  
  // Validate token
  try {
    const response = await fetch('https://nitroauth.com/api/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ auth_token: token, user_id: userId })
    });
    
    const result = await response.json();
    
    if (!result.valid) {
      // Token invalid, redirect to auth
      const authUrl = `https://nitroauth.com/authorize?site=houseatreides&redirect_url=${encodeURIComponent(request.url)}`;
      return NextResponse.redirect(authUrl);
    }
    
    // Add user data to headers for your app
    const response = NextResponse.next();
    response.headers.set('x-user-role', result.user.role);
    response.headers.set('x-user-email', result.user.email);
    return response;
    
  } catch (error) {
    console.error('Auth validation error:', error);
    const authUrl = `https://nitroauth.com/authorize?site=houseatreides&redirect_url=${encodeURIComponent(request.url)}`;
    return NextResponse.redirect(authUrl);
  }
}

export const config = {
  matcher: ['/dashboard/:path*', '/premium/:path*']
};
```

## Callback Handler Example

```javascript
// pages/api/auth/callback.js - Handle the redirect from NitroAuth
export default async function handler(req, res) {
  const { auth_token, user_id, timestamp } = req.query;
  
  if (!auth_token || !user_id) {
    return res.status(400).json({ error: 'Missing auth parameters' });
  }
  
  // Validate the token
  try {
    const response = await fetch('https://nitroauth.com/api/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ auth_token, user_id })
    });
    
    const result = await response.json();
    
    if (result.valid) {
      // Set secure cookies
      res.setHeader('Set-Cookie', [
        `auth_token=${auth_token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=3600`,
        `user_id=${user_id}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=3600`
      ]);
      
      // Redirect to intended destination
      res.redirect('/dashboard');
    } else {
      res.status(401).json({ error: 'Authentication failed' });
    }
    
  } catch (error) {
    console.error('Auth callback error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}
```

## Testing the Integration

1. Visit your site that requires authentication
2. You should be redirected to `https://nitroauth.com/authorize`
3. Sign in to NitroAuth (or use existing session)
4. You'll be redirected back with authentication tokens
5. Your site validates the tokens and grants access

## Support

For integration support or to request access to additional sites, contact your NitroAuth administrator.