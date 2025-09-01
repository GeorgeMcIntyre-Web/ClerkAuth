# External Site Integration Guide

## Quick Start

Integrate any website with NitroAuth authentication in 3 steps:

1. **Redirect** unauthenticated users to NitroAuth
2. **Handle callback** with authentication parameters
3. **Validate tokens** server-side

## Integration Overview

```
Your Site → NitroAuth → Your Site (with token) → Validate → Grant Access
```

## Step-by-Step Integration

### Step 1: Redirect to NitroAuth

When a user needs authentication, redirect them:

```javascript
const authUrl = `https://nitroauth.com/authorize?site=${SITE_NAME}&redirect_url=${encodeURIComponent(callbackUrl)}`
window.location.href = authUrl
```

**Parameters:**
- `site`: Your site identifier (choose any unique name)
- `redirect_url`: Where users return after authentication

### Step 2: Handle the Callback

NitroAuth redirects users back with:
```
https://yoursite.com/callback?auth_token=JWT_TOKEN&user_id=USER_ID&timestamp=TIMESTAMP
```

Extract these parameters and validate the token.

### Step 3: Validate the Token

**CRITICAL**: Always validate server-side:

```javascript
const response = await fetch('https://nitroauth.com/api/validate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    auth_token: token,
    user_id: userId
  })
})

const result = await response.json()
if (result.valid) {
  // User is authenticated
  console.log('User:', result.user)
} else {
  // Authentication failed
  redirectToAuth()
}
```

## Framework-Specific Examples

### Next.js (App Router)

**middleware.ts:**
```typescript
import { NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  const authToken = request.cookies.get('auth_token')?.value
  const userId = request.cookies.get('user_id')?.value

  if (!authToken || !(await validateToken(authToken, userId))) {
    const authUrl = `https://nitroauth.com/authorize?site=myapp&redirect_url=${encodeURIComponent(request.url)}`
    return NextResponse.redirect(authUrl)
  }

  return NextResponse.next()
}

async function validateToken(token: string, userId: string): Promise<boolean> {
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

export const config = {
  matcher: ['/dashboard/:path*', '/protected/:path*']
}
```

**app/auth/callback/page.tsx:**
```typescript
'use client'
import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function AuthCallback() {
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    const token = searchParams.get('auth_token')
    const userId = searchParams.get('user_id')

    if (token && userId) {
      // Set secure cookies
      document.cookie = `auth_token=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=3600`
      document.cookie = `user_id=${userId}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=3600`
      
      // Redirect to intended destination
      router.push('/dashboard')
    } else {
      router.push('/error?message=Authentication failed')
    }
  }, [searchParams, router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Authenticating...</h2>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    </div>
  )
}
```

### React SPA

**AuthProvider.tsx:**
```typescript
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface User {
  id: string
  email: string
  role: string
  siteAccess: string[]
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: () => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuthStatus()
  }, [])

  async function checkAuthStatus() {
    const token = localStorage.getItem('auth_token')
    const userId = localStorage.getItem('user_id')

    if (!token || !userId) {
      setLoading(false)
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
        localStorage.removeItem('auth_token')
        localStorage.removeItem('user_id')
      }
    } catch (error) {
      console.error('Auth validation failed:', error)
      localStorage.removeItem('auth_token')
      localStorage.removeItem('user_id')
    } finally {
      setLoading(false)
    }
  }

  function login() {
    const authUrl = `https://nitroauth.com/authorize?site=myreactapp&redirect_url=${encodeURIComponent(window.location.origin + '/auth/callback')}`
    window.location.href = authUrl
  }

  function logout() {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user_id')
    setUser(null)
    window.location.href = '/'
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
```

**Protected Route Component:**
```typescript
import { useAuth } from './AuthProvider'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading, login } = useAuth()

  if (loading) {
    return <div>Loading...</div>
  }

  if (!user) {
    return (
      <div className="text-center py-8">
        <h2 className="text-xl mb-4">Authentication Required</h2>
        <button 
          onClick={login}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Sign In
        </button>
      </div>
    )
  }

  return <>{children}</>
}
```

### WordPress (PHP)

**functions.php:**
```php
<?php
// Add to your theme's functions.php

class NitroAuth {
    private $site_name = 'myblog'; // Change this to your site identifier
    private $nitroauth_url = 'https://nitroauth.com';
    
    public function __construct() {
        add_action('init', [$this, 'handle_auth_callback']);
        add_action('wp', [$this, 'check_authentication']);
    }
    
    public function check_authentication() {
        // Only check auth for specific pages/posts
        if (!$this->requires_auth()) {
            return;
        }
        
        $token = $_COOKIE['nitroauth_token'] ?? null;
        $user_id = $_COOKIE['nitroauth_user_id'] ?? null;
        
        if (!$token || !$this->validate_token($token, $user_id)) {
            $this->redirect_to_auth();
        }
    }
    
    public function handle_auth_callback() {
        if (isset($_GET['auth_token']) && isset($_GET['user_id'])) {
            $token = sanitize_text_field($_GET['auth_token']);
            $user_id = sanitize_text_field($_GET['user_id']);
            
            if ($this->validate_token($token, $user_id)) {
                // Set secure cookies
                setcookie('nitroauth_token', $token, [
                    'expires' => time() + 3600,
                    'path' => '/',
                    'secure' => is_ssl(),
                    'httponly' => true,
                    'samesite' => 'Strict'
                ]);
                
                setcookie('nitroauth_user_id', $user_id, [
                    'expires' => time() + 3600,
                    'path' => '/',
                    'secure' => is_ssl(),
                    'httponly' => true,
                    'samesite' => 'Strict'
                ]);
                
                // Redirect to remove tokens from URL
                wp_redirect(home_url());
                exit;
            }
        }
    }
    
    private function validate_token($token, $user_id) {
        $response = wp_remote_post($this->nitroauth_url . '/api/validate', [
            'headers' => ['Content-Type' => 'application/json'],
            'body' => json_encode([
                'auth_token' => $token,
                'user_id' => $user_id
            ])
        ]);
        
        if (is_wp_error($response)) {
            return false;
        }
        
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        
        return isset($data['valid']) && $data['valid'] === true;
    }
    
    private function redirect_to_auth() {
        $redirect_url = urlencode($this->get_current_url());
        $auth_url = $this->nitroauth_url . '/authorize?site=' . $this->site_name . '&redirect_url=' . $redirect_url;
        
        wp_redirect($auth_url);
        exit;
    }
    
    private function requires_auth() {
        // Customize this logic for your needs
        return is_page('premium') || is_category('members-only') || has_tag('protected');
    }
    
    private function get_current_url() {
        return (is_ssl() ? 'https' : 'http') . '://' . $_SERVER['HTTP_HOST'] . $_SERVER['REQUEST_URI'];
    }
}

// Initialize the authentication system
new NitroAuth();
```

### Python/Django

**middleware.py:**
```python
import json
import requests
from django.http import HttpResponseRedirect
from django.conf import settings
from urllib.parse import urlencode

class NitroAuthMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        self.site_name = getattr(settings, 'NITROAUTH_SITE_NAME', 'mydjango')
        self.nitroauth_url = getattr(settings, 'NITROAUTH_URL', 'https://nitroauth.com')
        
    def __call__(self, request):
        if self.requires_auth(request.path):
            if not self.is_authenticated(request):
                return self.redirect_to_auth(request)
        
        response = self.get_response(request)
        return response
    
    def is_authenticated(self, request):
        token = request.COOKIES.get('nitroauth_token')
        user_id = request.COOKIES.get('nitroauth_user_id')
        
        if not token or not user_id:
            return False
            
        return self.validate_token(token, user_id)
    
    def validate_token(self, token, user_id):
        try:
            response = requests.post(
                f'{self.nitroauth_url}/api/validate',
                json={'auth_token': token, 'user_id': user_id},
                timeout=10
            )
            return response.json().get('valid', False)
        except:
            return False
    
    def redirect_to_auth(self, request):
        redirect_url = request.build_absolute_uri()
        auth_url = f'{self.nitroauth_url}/authorize?{urlencode({
            "site": self.site_name,
            "redirect_url": redirect_url
        })}'
        return HttpResponseRedirect(auth_url)
    
    def requires_auth(self, path):
        # Customize these paths based on your app
        protected_paths = ['/dashboard/', '/profile/', '/premium/']
        return any(path.startswith(p) for p in protected_paths)
```

**views.py:**
```python
from django.http import HttpResponseRedirect, JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json

@csrf_exempt
def auth_callback(request):
    token = request.GET.get('auth_token')
    user_id = request.GET.get('user_id')
    
    if not token or not user_id:
        return JsonResponse({'error': 'Missing authentication parameters'}, status=400)
    
    # Validate token (reuse validation logic from middleware)
    middleware = NitroAuthMiddleware(None)
    if not middleware.validate_token(token, user_id):
        return JsonResponse({'error': 'Invalid token'}, status=401)
    
    response = HttpResponseRedirect('/dashboard/')
    response.set_cookie('nitroauth_token', token, max_age=3600, secure=True, httponly=True, samesite='Strict')
    response.set_cookie('nitroauth_user_id', user_id, max_age=3600, secure=True, httponly=True, samesite='Strict')
    
    return response
```

### Express.js (Node.js)

**middleware/auth.js:**
```javascript
const fetch = require('node-fetch')

const SITE_NAME = 'myexpressapp'
const NITROAUTH_URL = 'https://nitroauth.com'

async function validateToken(token, userId) {
  try {
    const response = await fetch(`${NITROAUTH_URL}/api/validate`, {
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

function authMiddleware(req, res, next) {
  const token = req.cookies.nitroauth_token
  const userId = req.cookies.nitroauth_user_id

  if (!token || !userId) {
    return redirectToAuth(req, res)
  }

  validateToken(token, userId).then(valid => {
    if (valid) {
      next()
    } else {
      redirectToAuth(req, res)
    }
  })
}

function redirectToAuth(req, res) {
  const redirectUrl = encodeURIComponent(`${req.protocol}://${req.get('host')}${req.originalUrl}`)
  const authUrl = `${NITROAUTH_URL}/authorize?site=${SITE_NAME}&redirect_url=${redirectUrl}`
  res.redirect(authUrl)
}

// Auth callback handler
function authCallback(req, res) {
  const { auth_token, user_id } = req.query

  if (!auth_token || !user_id) {
    return res.status(400).send('Missing authentication parameters')
  }

  validateToken(auth_token, user_id).then(valid => {
    if (valid) {
      res.cookie('nitroauth_token', auth_token, { 
        maxAge: 3600000, 
        httpOnly: true, 
        secure: true, 
        sameSite: 'strict' 
      })
      res.cookie('nitroauth_user_id', user_id, { 
        maxAge: 3600000, 
        httpOnly: true, 
        secure: true, 
        sameSite: 'strict' 
      })
      res.redirect('/dashboard')
    } else {
      res.status(401).send('Authentication failed')
    }
  })
}

module.exports = { authMiddleware, authCallback }
```

**app.js:**
```javascript
const express = require('express')
const cookieParser = require('cookie-parser')
const { authMiddleware, authCallback } = require('./middleware/auth')

const app = express()

app.use(cookieParser())

// Auth callback route
app.get('/auth/callback', authCallback)

// Protected routes
app.use('/dashboard', authMiddleware)
app.use('/premium', authMiddleware)

app.listen(3000)
```

## Security Best Practices

### Token Storage
```javascript
// ✅ Secure (recommended)
document.cookie = `auth_token=${token}; HttpOnly; Secure; SameSite=Strict; Max-Age=3600`

// ❌ Insecure (avoid)
localStorage.setItem('auth_token', token) // Vulnerable to XSS
```

### Token Validation
```javascript
// ✅ Always validate server-side
async function validateOnServer(token, userId) {
  const response = await fetch('/api/validate-token', {
    method: 'POST',
    body: JSON.stringify({ token, userId })
  })
  return response.json()
}

// ❌ Never trust client-side only
function validateOnClient(token) {
  // This can be bypassed - never rely on client-side validation only
  return jwt.verify(token, 'secret')
}
```

### HTTPS Requirements
- ✅ Always use HTTPS in production
- ✅ Set Secure flag on cookies
- ✅ Use SameSite=Strict for security cookies

## Testing Your Integration

### Manual Testing
1. **Visit protected page** → Should redirect to NitroAuth
2. **Sign in at NitroAuth** → Should redirect back with token
3. **Access granted** → Should access protected content
4. **Token expires** → Should re-authenticate after 1 hour

### Automated Testing
```javascript
// Test the auth flow
describe('NitroAuth Integration', () => {
  test('redirects unauthenticated users', async () => {
    const response = await fetch('/protected-page')
    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toContain('nitroauth.com/authorize')
  })

  test('validates tokens correctly', async () => {
    const validToken = 'eyJ...' // Mock valid token
    const response = await fetch('/api/validate-token', {
      method: 'POST',
      body: JSON.stringify({ token: validToken, userId: 'user_123' })
    })
    const result = await response.json()
    expect(result.valid).toBe(true)
  })
})
```

## Troubleshooting

### Common Issues

**Redirect Loop**
```javascript
// ❌ Problem: Callback URL also protected
app.use('/auth/callback', authMiddleware) // This causes loops!

// ✅ Solution: Exclude callback from auth check
function requiresAuth(path) {
  return !path.startsWith('/auth/callback') && path.startsWith('/protected')
}
```

**Token Validation Fails**
```javascript
// Check these common issues:
1. Token expired (1-hour limit)
2. User ID doesn't match token
3. Network issues with NitroAuth
4. Incorrect API endpoint URL
```

**CORS Issues**
```javascript
// Add CORS headers if needed
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'https://nitroauth.com')
  res.header('Access-Control-Allow-Credentials', 'true')
  next()
})
```

### Debug Mode
Enable detailed logging:
```javascript
const DEBUG = process.env.NODE_ENV === 'development'

async function validateToken(token, userId) {
  if (DEBUG) console.log('Validating token for user:', userId)
  
  try {
    const response = await fetch('https://nitroauth.com/api/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ auth_token: token, user_id: userId })
    })
    
    const result = await response.json()
    if (DEBUG) console.log('Validation result:', result)
    
    return result.valid
  } catch (error) {
    if (DEBUG) console.error('Validation error:', error)
    return false
  }
}
```

## Performance Optimization

### Token Caching
```javascript
const tokenCache = new Map()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

async function validateTokenWithCache(token, userId) {
  const cacheKey = `${token}:${userId}`
  const cached = tokenCache.get(cacheKey)
  
  if (cached && cached.expires > Date.now()) {
    return cached.valid
  }
  
  const valid = await validateToken(token, userId)
  
  tokenCache.set(cacheKey, {
    valid,
    expires: Date.now() + CACHE_TTL
  })
  
  return valid
}
```

### Batch Validation
```javascript
// For high-traffic sites, batch multiple validations
async function validateMultipleTokens(tokenPairs) {
  const response = await fetch('https://nitroauth.com/api/validate-batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tokens: tokenPairs })
  })
  return response.json()
}
```

## Getting Your Site Added to NitroAuth

1. **Contact NitroAuth Admin** with your site details
2. **Provide site information**:
   - Site name/identifier
   - Production URL
   - Site description
   - Permission level needed (standard/premium/admin)

3. **Admin adds your site** through NitroAuth admin panel
4. **Test integration** using the authorization flow
5. **Go live** once testing is complete

## Support

### Resources
- **Integration Examples**: This document
- **API Reference**: NitroAuth developer documentation
- **Security Guide**: Best practices and requirements

### Getting Help
1. Check troubleshooting section
2. Verify configuration matches examples
3. Test with debug mode enabled
4. Contact NitroAuth support with specific error messages