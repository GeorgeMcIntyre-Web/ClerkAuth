# External Application Integration with NitroAuth

## Overview

This guide shows how to integrate **ANY external application** with NitroAuth without NitroAuth needing to know about your application beforehand. This is a truly universal system.

## Integration Flow

```
Your App → NitroAuth (Universal) → Your App (Authenticated)
```

## Step 1: Redirect Users to NitroAuth

When your application needs to authenticate a user, redirect them to:

```
https://nitroauth.com/auth?site=YOUR_APP_NAME&redirect_url=YOUR_CALLBACK_URL
```

**Parameters:**
- `site`: Your application identifier (e.g., "myapp", "blog", "ecommerce")  
- `redirect_url`: Where users return after authentication

## Step 2: Handle the Callback

NitroAuth will redirect users back to your `redirect_url` with authentication data:

```
https://yourapp.com/callback?auth_token=JWT&user_id=USER_ID&user_email=EMAIL&user_role=ROLE&site_name=SITE&timestamp=TIME
```

## Step 3: Validate the Token

Make a server-side request to validate the token:

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
  // User is authenticated and authorized for your app
  const user = result.user
  console.log('Authenticated user:', user.email)
} else {
  // Authentication failed or user not authorized
  redirectToAuth()
}
```

## Complete Integration Examples

### Next.js Application

**middleware.ts:**
```typescript
import { NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  // Skip auth for public routes
  if (request.nextUrl.pathname.startsWith('/public') || 
      request.nextUrl.pathname.startsWith('/api/auth/callback')) {
    return NextResponse.next()
  }

  const token = request.cookies.get('auth_token')?.value
  const userId = request.cookies.get('user_id')?.value

  if (!token || !(await validateToken(token, userId))) {
    // Redirect to NitroAuth
    const callbackUrl = `${request.nextUrl.origin}/api/auth/callback`
    const authUrl = `https://nitroauth.com/auth?site=myapp&redirect_url=${encodeURIComponent(callbackUrl)}`
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
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
}
```

**pages/api/auth/callback.js:**
```javascript
export default async function handler(req, res) {
  const { auth_token, user_id, user_email, user_role, site_name } = req.query

  if (!auth_token || !user_id) {
    return res.status(400).json({ error: 'Missing authentication data' })
  }

  // Validate token with NitroAuth
  try {
    const response = await fetch('https://nitroauth.com/api/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ auth_token, user_id })
    })

    const result = await response.json()
    
    if (result.valid) {
      // Set secure authentication cookies
      res.setHeader('Set-Cookie', [
        `auth_token=${auth_token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=3600`,
        `user_id=${user_id}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=3600`,
        `user_email=${user_email}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=3600`,
        `user_role=${user_role}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=3600`
      ])
      
      // Redirect to your application
      res.redirect('/dashboard')
    } else {
      res.status(401).json({ error: 'Invalid authentication token' })
    }
  } catch (error) {
    console.error('Auth validation error:', error)
    res.status(500).json({ error: 'Authentication failed' })
  }
}
```

### React SPA

**App.js:**
```jsx
import { useState, useEffect, createContext, useContext } from 'react'

const AuthContext = createContext()

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/*" element={
            <ProtectedRoute>
              <AppContent />
            </ProtectedRoute>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
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
        // Clear invalid tokens
        localStorage.removeItem('auth_token')
        localStorage.removeItem('user_id')
      }
    } catch (error) {
      console.error('Auth check failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const login = () => {
    const callbackUrl = `${window.location.origin}/auth/callback`
    const authUrl = `https://nitroauth.com/auth?site=myreactapp&redirect_url=${encodeURIComponent(callbackUrl)}`
    window.location.href = authUrl
  }

  const logout = () => {
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

function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('auth_token')
    const userId = params.get('user_id')

    if (token && userId) {
      // Store authentication data
      localStorage.setItem('auth_token', token)
      localStorage.setItem('user_id', userId)
      localStorage.setItem('user_email', params.get('user_email') || '')
      localStorage.setItem('user_role', params.get('user_role') || '')
      
      // Redirect to app
      navigate('/dashboard')
    } else {
      navigate('/error')
    }
  }, [navigate])

  return <div>Authenticating...</div>
}

function ProtectedRoute({ children }) {
  const { user, loading, login } = useContext(AuthContext)

  if (loading) return <div>Loading...</div>

  if (!user) {
    return (
      <div>
        <h2>Authentication Required</h2>
        <button onClick={login}>Sign In with NitroAuth</button>
      </div>
    )
  }

  return children
}
```

### WordPress Integration

**functions.php:**
```php
class NitroAuthUniversal {
    private $site_name = 'myblog';
    private $nitroauth_url = 'https://nitroauth.com';
    
    public function __construct() {
        add_action('init', [$this, 'handle_auth_callback']);
        add_action('template_redirect', [$this, 'check_authentication']);
    }
    
    public function check_authentication() {
        // Only protect specific pages/posts
        if (!$this->requires_auth()) return;
        
        if (!$this->is_authenticated()) {
            $this->redirect_to_auth();
        }
    }
    
    public function handle_auth_callback() {
        if (isset($_GET['auth_token']) && isset($_GET['user_id'])) {
            $token = sanitize_text_field($_GET['auth_token']);
            $user_id = sanitize_text_field($_GET['user_id']);
            
            if ($this->validate_token($token, $user_id)) {
                $this->set_auth_cookies($token, $user_id);
                wp_redirect(home_url());
                exit;
            }
        }
    }
    
    private function is_authenticated() {
        $token = $_COOKIE['nitroauth_token'] ?? null;
        $user_id = $_COOKIE['nitroauth_user_id'] ?? null;
        
        return $token && $user_id && $this->validate_token($token, $user_id);
    }
    
    private function validate_token($token, $user_id) {
        $response = wp_remote_post($this->nitroauth_url . '/api/validate', [
            'headers' => ['Content-Type' => 'application/json'],
            'body' => json_encode(['auth_token' => $token, 'user_id' => $user_id])
        ]);
        
        if (is_wp_error($response)) return false;
        
        $data = json_decode(wp_remote_retrieve_body($response), true);
        return $data['valid'] ?? false;
    }
    
    private function redirect_to_auth() {
        $callback_url = home_url('/') . '?nitroauth_callback=1';
        $auth_url = $this->nitroauth_url . '/auth?site=' . $this->site_name . '&redirect_url=' . urlencode($callback_url);
        wp_redirect($auth_url);
        exit;
    }
    
    private function set_auth_cookies($token, $user_id) {
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
    }
    
    private function requires_auth() {
        // Customize based on your needs
        return is_page(['premium', 'members']) || 
               has_tag('protected') || 
               is_category('members-only');
    }
}

new NitroAuthUniversal();
```

## Getting Access for Your Application

### For Admins

1. **Go to NitroAuth Admin**: `https://nitroauth.com/admin`
2. **Click "🌐 Universal Access"**
3. **Grant user access** by:
   - Domain (e.g., "yourapp.com")
   - App name (e.g., "myapp")
   - Full URL (e.g., "https://yourapp.com")
   - Universal permissions ("standard_sites", "premium_sites", etc.)

### Access Types

- **Domain Access**: `yourapp.com` - Access to any URL on that domain
- **App Name**: `myapp` - Access when site parameter matches
- **URL Access**: `https://yourapp.com/premium` - Access to specific URLs
- **Universal**: `premium_sites` - Access to all premium applications

## Testing Your Integration

### 1. Manual Test
1. Visit your protected page
2. Should redirect to `https://nitroauth.com/auth?site=yourapp&redirect_url=...`
3. Sign in if needed
4. Should redirect back with authentication tokens
5. Your app validates tokens and grants access

### 2. Debug Information

The authentication URL includes helpful data:
```
https://yourapp.com/callback
  ?auth_token=JWT_TOKEN
  &user_id=USER_ID
  &user_email=user@example.com
  &user_role=premium
  &site_name=yourapp
  &timestamp=1234567890
```

## Error Handling

### Common Issues

**Access Denied**: User doesn't have permission for your app
- Solution: Admin grants access via "Universal Access Manager"

**Invalid Token**: Token expired or invalid
- Solution: Redirect user back to NitroAuth for re-authentication

**Redirect Loop**: Callback URL is also protected
- Solution: Ensure callback URLs bypass authentication checks

## Security Best Practices

- ✅ **Always validate tokens server-side**
- ✅ **Use HTTPS for all communications**
- ✅ **Store tokens in secure, HTTP-only cookies**
- ✅ **Set short token expiration times**
- ✅ **Log authentication events**

## Benefits of Universal System

1. **No Pre-Configuration**: Your app works immediately without NitroAuth setup
2. **Dynamic Access**: Admins can grant/revoke access in real-time
3. **Flexible Permissions**: Domain, URL, or app-name based access
4. **Universal Scaling**: Works with unlimited applications
5. **Technology Agnostic**: Works with any framework or language

## Need Help?

- **Documentation**: Complete guides available in NitroAuth repository
- **Admin Support**: Contact NitroAuth administrators for access issues
- **Technical Issues**: Check browser console and server logs for error details

Your application is now ready for universal authentication with NitroAuth! 🚀