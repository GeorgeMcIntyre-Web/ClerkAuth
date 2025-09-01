# Vercel + Neon + Clerk Template

A full-stack Next.js template with authentication (Clerk) and PostgreSQL database (Neon), ready to deploy on Vercel.

## Features

- 🔐 **Authentication**: Complete auth flow with Clerk
- 🗄️ **Database**: PostgreSQL with Neon (serverless)
- 🎨 **Styling**: Tailwind CSS
- 🔒 **Protected Routes**: Middleware-based route protection
- 📱 **Responsive**: Mobile-first design
- 🚀 **API Routes**: Protected backend endpoints
- 📦 **Type Safety**: Full TypeScript support
- 🗃️ **ORM**: Drizzle ORM with type-safe queries

## Quick Start

### 1. Clone and Install

```bash
npx create-next-app@latest my-app --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*"
cd my-app
npm install @clerk/nextjs @neondatabase/serverless drizzle-orm drizzle-kit
```

### 2. Set Up Environment Variables

Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
cp .env.example .env.local
```

#### Get Your Credentials:

**Clerk (Authentication):**
1. Sign up at [clerk.com](https://clerk.com)
2. Create a new application
3. Copy your publishable and secret keys from the API Keys page

**Neon (Database):**
1. Sign up at [neon.tech](https://neon.tech)
2. Create a new project
3. Copy the connection string from your dashboard

### 3. Set Up Database

```bash
# Generate migration files
npm run db:generate

# Run migrations
npm run db:migrate

# Optional: Open Drizzle Studio to view your database
npm run db:studio
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see your application.

## Project Structure

```
├── app/
│   ├── (auth)/
│   │   ├── sign-in/[[...sign-in]]/page.tsx
│   │   └── sign-up/[[...sign-up]]/page.tsx
│   ├── api/
│   │   └── protected/
│   │       ├── user/route.ts
│   │       └── posts/route.ts
│   ├── dashboard/page.tsx
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── lib/
│   ├── db.ts
│   └── schema.ts
├── drizzle.config.ts
├── middleware.ts
└── package.json
```

## API Endpoints

### Protected Routes
- `GET /api/protected/user` - Get current user data
- `PUT /api/protected/user` - Update user profile
- `GET /api/protected/posts` - Get user's posts
- `POST /api/protected/posts` - Create a new post

All protected routes require authentication via Clerk.

## Database Schema

The template includes two main tables:
- `users` - User profiles synced with Clerk
- `posts` - User-generated content

You can extend the schema in `lib/schema.ts` and run `npm run db:generate` to create migrations.

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add your environment variables in Vercel dashboard
4. Deploy!

The application will automatically run database migrations on build.

### Environment Variables for Production

Make sure to set these in your Vercel dashboard:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `DATABASE_URL`
- `NEXT_PUBLIC_APP_URL` (your Vercel URL)

## Customization

### Adding New Database Tables

1. Define your schema in `lib/schema.ts`
2. Generate migration: `npm run db:generate`
3. Run migration: `npm run db:migrate`

### Styling

The template uses Tailwind CSS. You can:
- Modify `app/globals.css` for global styles
- Use Tailwind classes throughout your components
- Customize the Tailwind config in `tailwind.config.js`

### Authentication

Clerk handles all authentication. You can customize:
- Sign-in/up pages in `app/(auth)/`
- User button appearance
- Authentication flows and redirects

## Useful Commands

```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm run start           # Start production server

# Database
npm run db:generate     # Generate migration files
npm run db:migrate      # Run database migrations
npm run db:studio       # Open Drizzle Studio

# Deployment
vercel                  # Deploy to Vercel
```

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Clerk Authentication](https://clerk.com/docs)
- [Neon Database](https://neon.tech/docs)
- [Drizzle ORM](https://orm.drizzle.team)
- [Tailwind CSS](https://tailwindcss.com/docs)

## License

MIT License - feel free to use this template for your projects!