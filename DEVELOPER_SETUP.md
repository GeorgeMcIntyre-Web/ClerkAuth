# Developer Setup Guide

This ClerkAuth template is a full-stack Next.js application with authentication, database, and deployment configuration.

## 🏗️ Tech Stack

- **Framework**: Next.js 14 with App Router
- **Authentication**: Clerk
- **Database**: Neon PostgreSQL (serverless)
- **ORM**: Drizzle with TypeScript
- **Deployment**: Vercel
- **Styling**: Tailwind CSS
- **Language**: TypeScript

## 📦 Project Structure

```
ClerkAuth/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   │   └── protected/     # Protected API endpoints
│   ├── dashboard/         # Dashboard pages (protected)
│   ├── error.tsx         # Global error page
│   ├── loading.tsx       # Global loading page
│   ├── not-found.tsx     # 404 page
│   └── layout.tsx        # Root layout with Clerk provider
├── lib/
│   ├── db.ts             # Database connection (lazy initialization)
│   └── schema.ts         # Database schema definition
├── components/           # Reusable UI components
└── middleware.ts         # Clerk authentication middleware
```

## 🔧 Local Development Setup

### 1. Clone Repository
```bash
git clone https://github.com/GeorgeMcIntyre-Web/ClerkAuth.git
cd ClerkAuth
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Variables
Create `.env.local` file:
```env
# Database (Neon PostgreSQL)
DATABASE_URL="postgresql://username:password@host/database?sslmode=require&channel_binding=require"

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."

# App URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 4. Database Setup
```bash
# Push schema to database
npx drizzle-kit push
```

### 5. Run Development Server
```bash
npm run dev
```

## 🔐 Authentication Setup (Clerk)

1. Create account at [clerk.com](https://clerk.com)
2. Create new application
3. Copy publishable key and secret key
4. Configure allowed redirect URLs:
   - Development: `http://localhost:3000`
   - Production: `https://your-domain.vercel.app`

## 🗄️ Database Setup (Neon)

1. Create account at [neon.tech](https://neon.tech)
2. Create new project
3. Copy connection string
4. Ensure connection string includes:
   - `sslmode=require`
   - `channel_binding=require`

## 🚀 Deployment (Vercel)

### Automatic Deployment
1. Connect GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on git push

### Manual Deployment
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Required Environment Variables
- `DATABASE_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_APP_URL`

## 📊 Database Schema

### Users Table
```typescript
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  clerkId: text('clerk_id').unique().notNull(),
  email: text('email').unique().notNull(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  imageUrl: text('image_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
})
```

### Posts Table
```typescript
export const posts = pgTable('posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  content: text('content'),
  authorId: uuid('author_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  published: boolean('published').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
})
```

## 🔒 Security Features

- **Authentication**: Clerk handles user authentication
- **Protected Routes**: Middleware protects dashboard and API routes
- **Security Headers**: CSP, XSS protection, CSRF protection
- **Environment Variables**: Sensitive data stored securely
- **Database**: Serverless with SSL/TLS encryption

## 📝 API Routes

### Public Routes
- `GET /` - Homepage

### Protected Routes
- `GET /dashboard` - User dashboard
- `GET /api/protected/user` - Get current user data
- `GET /api/protected/posts` - Get user's posts
- `POST /api/protected/posts` - Create new post

## 🧪 Testing Deployment

1. **Homepage**: Verify loading and styling
2. **Authentication**: Test sign up/sign in flows
3. **Dashboard**: Access after authentication
4. **API Endpoints**: Test protected routes
5. **Database**: Verify CRUD operations work

## 🐛 Common Issues

### Build Errors
- **Database Connection**: Ensure lazy initialization in `lib/db.ts`
- **Environment Variables**: Verify all required vars are set
- **Type Errors**: Run `npm run type-check`

### Authentication Issues
- **Redirect URLs**: Must match exactly in Clerk dashboard
- **Keys**: Ensure using correct publishable/secret key pair
- **Middleware**: Verify `middleware.ts` is correctly configured

### Database Issues
- **Connection String**: Must include SSL parameters
- **Schema**: Run `npx drizzle-kit push` after schema changes
- **Permissions**: Ensure database user has required permissions

## 🔄 Development Workflow

1. Make changes locally
2. Test on development server
3. Run type checking: `npm run type-check`
4. Commit and push to GitHub
5. Vercel deploys automatically
6. Test production deployment

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Clerk Documentation](https://clerk.com/docs)
- [Neon Documentation](https://neon.tech/docs)
- [Drizzle Documentation](https://orm.drizzle.team)
- [Vercel Documentation](https://vercel.com/docs)