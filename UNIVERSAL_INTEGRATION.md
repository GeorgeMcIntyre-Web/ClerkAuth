# NitroAuth Universal Integration Guide

## Overview

NitroAuth is a centralized authentication system that works with **ANY website or application**. This guide shows how to integrate any site with NitroAuth using minimal code.

## Core Concept

1. **User visits your site** → Gets redirected to NitroAuth
2. **NitroAuth handles authentication** → Checks permissions
3. **User gets redirected back** → With secure token
4. **Your site validates token** → Grants/denies access

## Integration Steps (Works with ANY Technology)

### Step 1: Redirect Unauthenticated Users

When a user needs authentication, redirect them to NitroAuth:

```
https://nitroauth.com/authorize?site=YOUR_SITE_NAME&redirect_url=YOUR_CALLBACK_URL
```

**Parameters:**
- `site`: Your site identifier (e.g., "myapp", "blog", "ecommerce")
- `redirect_url`: Where users return after authentication

### Step 2: Handle the Callback

NitroAuth redirects users back with authentication data:

```
https://yoursite.com/auth/callback?auth_token=JWT_TOKEN&user_id=USER_ID&timestamp=TIMESTAMP
```

### Step 3: Validate the Token

Make a server-side request to verify the token:

```http
POST https://nitroauth.com/api/validate
Content-Type: application/json

{
  "auth_token": "JWT_TOKEN",
  "user_id": "USER_ID"
}
```

**Success Response:**
```json
{
  "valid": true,
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "role": "premium",
    "siteAccess": ["premium_tools", "basic_tools"]
  }
}
```

## Technology-Specific Examples

### Next.js (App Router)

**middleware.ts:**
```typescript
import { NextResponse } from 'next/server'

export async function middleware(request) {
  const token = request.cookies.get('auth_token')?.value
  const userId = request.cookies.get('user_id')?.value
  
  if (!token) {
    const authUrl = `https://nitroauth.com/authorize?site=myapp&redirect_url=${encodeURIComponent(request.url)}`
    return NextResponse.redirect(authUrl)
  }
  
  // Validate token
  const response = await fetch('https://nitroauth.com/api/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ auth_token: token, user_id: userId })
  })
  
  const result = await response.json()
  if (!result.valid) {
    const authUrl = `https://nitroauth.com/authorize?site=myapp&redirect_url=${encodeURIComponent(request.url)}`
    return NextResponse.redirect(authUrl)
  }
  
  return NextResponse.next()
}
```

**Callback handler (app/auth/callback/page.tsx):**
```typescript
'use client'
import { useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

export default function AuthCallback() {
  const searchParams = useSearchParams()
  
  useEffect(() => {
    const token = searchParams.get('auth_token')
    const userId = searchParams.get('user_id')
    
    if (token && userId) {
      // Set secure cookies
      document.cookie = `auth_token=${token}; HttpOnly; Secure; SameSite=Strict; Max-Age=3600`
      document.cookie = `user_id=${userId}; HttpOnly; Secure; SameSite=Strict; Max-Age=3600`
      
      // Redirect to intended destination
      window.location.href = '/dashboard'
    }
  }, [searchParams])
  
  return <div>Authenticating...</div>
}
```

### WordPress (PHP)

**functions.php:**
```php
function nitroauth_check() {
    if (!isset($_COOKIE['auth_token']) || !isset($_COOKIE['user_id'])) {
        $auth_url = 'https://nitroauth.com/authorize?site=myblog&redirect_url=' . urlencode($_SERVER['REQUEST_URI']);
        wp_redirect($auth_url);
        exit;
    }
    
    // Validate token
    $response = wp_remote_post('https://nitroauth.com/api/validate', [
        'headers' => ['Content-Type' => 'application/json'],
        'body' => json_encode([
            'auth_token' => $_COOKIE['auth_token'],
            'user_id' => $_COOKIE['user_id']
        ])
    ]);
    
    $result = json_decode(wp_remote_retrieve_body($response), true);
    if (!$result['valid']) {
        $auth_url = 'https://nitroauth.com/authorize?site=myblog&redirect_url=' . urlencode($_SERVER['REQUEST_URI']);
        wp_redirect($auth_url);
        exit;
    }
}

// Hook to run on protected pages
add_action('template_redirect', 'nitroauth_check');
```

### React SPA

**AuthProvider.jsx:**
```javascript
import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    checkAuth()
  }, [])
  
  async function checkAuth() {
    const token = localStorage.getItem('auth_token')
    const userId = localStorage.getItem('user_id')
    
    if (!token) {
      redirectToAuth()
      return
    }
    
    try {
      const response = await fetch('https://nitroauth.com/api/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auth_token: token, user_id: userId })
      })
      
      const result = await response.json()
      if (result.valid) {
        setUser(result.user)
      } else {
        redirectToAuth()
      }
    } catch (error) {
      redirectToAuth()
    } finally {
      setLoading(false)
    }
  }
  
  function redirectToAuth() {
    const authUrl = `https://nitroauth.com/authorize?site=myreactapp&redirect_url=${encodeURIComponent(window.location.href)}`
    window.location.href = authUrl
  }
  
  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
```

### Python/Django

**middleware.py:**
```python
import requests
from django.http import HttpResponseRedirect
from django.urls import reverse

class NitroAuthMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        if self.requires_auth(request.path):
            token = request.COOKIES.get('auth_token')
            user_id = request.COOKIES.get('user_id')
            
            if not token or not self.validate_token(token, user_id):
                auth_url = f"https://nitroauth.com/authorize?site=mydjango&redirect_url={request.build_absolute_uri()}"
                return HttpResponseRedirect(auth_url)
        
        return self.get_response(request)
    
    def validate_token(self, token, user_id):
        try:
            response = requests.post('https://nitroauth.com/api/validate', 
                json={'auth_token': token, 'user_id': user_id})
            return response.json().get('valid', False)
        except:
            return False
    
    def requires_auth(self, path):
        # Define which paths need authentication
        protected_paths = ['/dashboard/', '/profile/', '/premium/']
        return any(path.startswith(p) for p in protected_paths)
```

### Static Site (Cloudflare Workers)

**worker.js:**
```javascript
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  
  // Check if route needs auth
  if (needsAuth(url.pathname)) {
    const token = getCookie(request, 'auth_token')
    const userId = getCookie(request, 'user_id')
    
    if (!token || !(await validateToken(token, userId))) {
      const authUrl = `https://nitroauth.com/authorize?site=mystaticsite&redirect_url=${encodeURIComponent(request.url)}`
      return Response.redirect(authUrl, 302)
    }
  }
  
  return fetch(request)
}

async function validateToken(token, userId) {
  try {
    const response = await fetch('https://nitroauth.com/api/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ auth_token: token, user_id: userId })
    })
    const result = await response.json()
    return result.valid
  } catch {
    return false
  }
}
```

## Configuration in NitroAuth Admin

1. **Visit**: `https://nitroauth.com/admin`
2. **Add your site** (when site management is available)
3. **Grant users access** to your site
4. **Test integration** using the authorization flow

## Security Best Practices

### Required
- ✅ **Always validate tokens server-side**
- ✅ **Use HTTPS only**
- ✅ **Check token expiration** (1-hour limit)
- ✅ **Store tokens in secure cookies** (HttpOnly, Secure, SameSite)

### Recommended
- 🔒 **Rate limit authentication attempts**
- 🔒 **Log security events**
- 🔒 **Handle token refresh gracefully**
- 🔒 **Clear tokens on logout**

## Testing Your Integration

### Manual Test
1. Visit a protected page on your site
2. Should redirect to NitroAuth
3. Sign in if not already authenticated
4. Should redirect back with token
5. Should validate token and grant access

### Automated Test
```javascript
// Test the auth flow
const response = await fetch('https://nitroauth.com/api/validate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    auth_token: 'your_test_token',
    user_id: 'your_test_user_id'
  })
})

const result = await response.json()
console.log('Token valid:', result.valid)
```

## Troubleshooting

### Common Issues

**Token Validation Fails:**
- Check token hasn't expired (1-hour limit)
- Verify user_id matches the token
- Ensure HTTPS is used

**Redirect Loop:**
- Make sure callback handler sets cookies properly
- Check that protected routes exclude callback URLs
- Verify redirect_url parameter is correctly encoded

**403 Forbidden:**
- User doesn't have permission for your site
- Check site permissions in NitroAuth admin
- Verify site name matches what's configured

## Site Permission Management

In NitroAuth admin, you can:
- **Add your site** to the allowed sites list
- **Grant specific users** access to your site
- **Set permission levels** (standard, premium, admin)
- **Revoke access** when needed

The admin determines who can access which sites - your site just validates the tokens.

## Summary

**Your site needs just 3 things:**
1. **Redirect** unauthenticated users to NitroAuth
2. **Handle callback** with auth parameters  
3. **Validate tokens** server-side

**NitroAuth handles:**
- User authentication
- Permission checking
- Token generation
- Security management

This creates a universal authentication system that works with any technology stack while maintaining enterprise-level security.