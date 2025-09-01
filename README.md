# ClerkAuth - Universal Authentication Hub

🚀 **Centralized authentication system for multiple websites with enterprise-grade security**

## What is ClerkAuth?

ClerkAuth is a universal authentication hub that allows you to manage user access across multiple websites from a single control panel. Users authenticate once and gain access to all their authorized sites with secure JWT tokens.

## Key Features

- ✅ **Universal Authentication** - Works with any website or technology stack
- ✅ **Enterprise Security** - JWT tokens, role-based permissions, audit logging
- ✅ **Admin Dashboard** - Manage users, roles, and site access from one place
- ✅ **Easy Integration** - 3 lines of code to integrate any site
- ✅ **Production Ready** - Built on Clerk Auth with Vercel deployment

## Quick Start

### For ClerkAuth Administrators

1. **Deploy ClerkAuth**
   ```bash
   git clone <repository>
   cd clerkauth
   npm install
   vercel deploy --prod
   ```

2. **Initial Setup**
   - Visit `https://your-clerkauth-domain.com/api/admin/setup`
   - First user becomes Super Admin
   - Configure additional users through admin panel

3. **Manage Sites & Users**
   - Add websites through admin panel
   - Grant users access to specific sites
   - Monitor authentication logs

### For Website Developers

Integrate any website with ClerkAuth in 3 steps:

1. **Redirect** unauthenticated users:
   ```javascript
   const authUrl = `https://clerkauth.com/authorize?site=myapp&redirect_url=${callbackUrl}`
   window.location.href = authUrl
   ```

2. **Handle callback** with auth parameters:
   ```javascript
   // Extract: ?auth_token=JWT&user_id=ID&timestamp=TIME
   ```

3. **Validate token** server-side:
   ```javascript
   const response = await fetch('https://clerkauth.com/api/validate', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ auth_token: token, user_id: userId })
   })
   ```

## System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Website A     │───▶│   ClerkAuth     │───▶│   Clerk Auth    │
│   Website B     │    │                 │    │                 │
│   Website C     │    │ - Authorization │    │ - User Storage  │
│   ...           │    │ - Token Issue   │    │ - Sessions      │
└─────────────────┘    │ - Admin Panel   │    │ - Security      │
                       └─────────────────┘    └─────────────────┘
```

## Technology Stack

- **Frontend**: Next.js 14 with React
- **Authentication**: Clerk (production-ready auth service)
- **Security**: JWT tokens (HS256, 1-hour expiration)
- **Deployment**: Vercel (serverless, auto-scaling)
- **Validation**: Zod schemas for input sanitization
- **Styling**: Tailwind CSS

## User Roles & Permissions

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

## Supported Integrations

ClerkAuth works with **any technology stack**:

- ✅ **Next.js** (App Router & Pages Router)
- ✅ **React** (SPA applications)
- ✅ **WordPress** (PHP integration)
- ✅ **Django/Python** (Middleware-based)
- ✅ **Express.js** (Node.js applications)
- ✅ **Static Sites** (Cloudflare Workers, Netlify Functions)
- ✅ **Any framework** that can make HTTP requests

## Security Features

- **JWT Tokens**: HS256 algorithm, 1-hour expiration
- **HTTPS Only**: All communications encrypted
- **Input Validation**: Zod schemas prevent XSS/injection
- **Rate Limiting**: Built-in protection against abuse
- **Audit Logging**: All admin actions tracked
- **Role-Based Access**: Granular permission system

## Documentation

### For Administrators
- **[ClerkAuth Developer Guide](DEVELOPER_GUIDE_CLERKAUTH.md)** - Complete setup and administration guide
- **[Universal Integration Guide](UNIVERSAL_INTEGRATION.md)** - Technical integration overview

### For Website Developers
- **[External Site Integration Guide](DEVELOPER_GUIDE_EXTERNAL_SITES.md)** - Framework-specific examples
- **[API Reference](#api-endpoints)** - Complete API documentation

## API Endpoints

### Authorization
```http
POST https://clerkauth.com/api/authorize
{
  "requestedSite": "myapp",
  "redirectUrl": "https://myapp.com/callback"
}
```

### Token Validation
```http
POST https://clerkauth.com/api/validate
{
  "auth_token": "JWT_TOKEN",
  "user_id": "USER_ID"
}
```

## Environment Variables

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...

# JWT Security (REQUIRED)
JWT_SECRET=your-256-bit-secret-key

# App URLs
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
```

## Development Setup

```bash
# Clone repository
git clone <repository>
cd clerkauth

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your Clerk keys

# Run development server
npm run dev

# Build for production
npm run build
npm run start
```

## Production Deployment

### Vercel (Recommended)
```bash
# Deploy to Vercel
vercel --prod

# Configure environment variables in Vercel dashboard
# Update Clerk with production domain
```

### Self-Hosting
```bash
# Build application
npm run build

# Start production server
npm run start

# Or use PM2 for production
pm2 start npm --name "clerkauth" -- start
```

## Getting Started Examples

### Next.js Integration (Complete Example)

**middleware.ts:**
```typescript
import { NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  // Check if route needs authentication
  if (!needsAuth(request.nextUrl.pathname)) {
    return NextResponse.next()
  }

  const token = request.cookies.get('auth_token')?.value
  const userId = request.cookies.get('user_id')?.value

  if (!token || !(await validateToken(token, userId))) {
    const authUrl = `https://clerkauth.com/authorize?site=myapp&redirect_url=${encodeURIComponent(request.url)}`
    return NextResponse.redirect(authUrl)
  }

  return NextResponse.next()
}

async function validateToken(token: string, userId: string): Promise<boolean> {
  try {
    const response = await fetch('https://clerkauth.com/api/validate', {
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

function needsAuth(pathname: string): boolean {
  const protectedPaths = ['/dashboard', '/premium', '/admin']
  return protectedPaths.some(path => pathname.startsWith(path))
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
}
```

### WordPress Integration (Complete Example)

**functions.php:**
```php
class ClerkAuth {
    private $site_name = 'myblog';
    private $clerkauth_url = 'https://clerkauth.com';
    
    public function __construct() {
        add_action('init', [$this, 'handle_auth_callback']);
        add_action('wp', [$this, 'check_authentication']);
    }
    
    public function check_authentication() {
        if (!$this->requires_auth()) return;
        
        $token = $_COOKIE['clerkauth_token'] ?? null;
        $user_id = $_COOKIE['clerkauth_user_id'] ?? null;
        
        if (!$token || !$this->validate_token($token, $user_id)) {
            $this->redirect_to_auth();
        }
    }
    
    private function validate_token($token, $user_id) {
        $response = wp_remote_post($this->clerkauth_url . '/api/validate', [
            'headers' => ['Content-Type' => 'application/json'],
            'body' => json_encode(['auth_token' => $token, 'user_id' => $user_id])
        ]);
        
        if (is_wp_error($response)) return false;
        
        $data = json_decode(wp_remote_retrieve_body($response), true);
        return $data['valid'] ?? false;
    }
    
    private function redirect_to_auth() {
        $redirect_url = urlencode($this->get_current_url());
        $auth_url = $this->clerkauth_url . '/authorize?site=' . $this->site_name . '&redirect_url=' . $redirect_url;
        wp_redirect($auth_url);
        exit;
    }
    
    private function requires_auth() {
        return is_page('premium') || has_tag('members-only');
    }
}

new ClerkAuth();
```

## Monitoring & Analytics

ClerkAuth provides comprehensive logging for:

- **Authentication Events**: Successful/failed logins
- **Authorization Requests**: Site access attempts
- **Admin Actions**: User role changes, permission updates
- **Security Events**: Suspicious activity, token validation failures

## Support & Community

- **Documentation**: Complete guides in `/docs` folder
- **Issues**: Report bugs via GitHub issues
- **Feature Requests**: Submit enhancement requests
- **Security**: Email security issues privately

## License

MIT License - see LICENSE file for details

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## Roadmap

- [ ] **Site Management UI** - Visual interface for adding/managing sites
- [ ] **Bulk User Import** - CSV/Excel user import functionality
- [ ] **SSO Integrations** - Google, Microsoft, GitHub SSO
- [ ] **Advanced Analytics** - Usage metrics and reporting
- [ ] **API Rate Limiting** - Per-site rate limiting configuration
- [ ] **Webhook Support** - Real-time event notifications
- [ ] **Multi-tenancy** - Support for multiple organizations

---

**Built with ❤️ for developers who need enterprise authentication without the enterprise complexity.**