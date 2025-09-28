# Unified Church CRM Integration Guide

## Overview

This guide covers the complete setup and deployment of the unified Church CRM system that integrates four codebases:
- **Windsurf Project**: Core CRM and church management
- **Embark2-Eric**: Assessment, planning, and clergy portals
- **Spark Fellowship**: Social networking and community features
- **Vocal Connect AI**: Pastoral care and micro-volunteering

## Architecture Overview

The unified system uses a **multi-codebase integration approach** with:
- **Shared Authentication**: Supabase Auth across all systems
- **Unified Navigation**: Cross-codebase navigation with external URL routing
- **Role-Based Access Control**: 3-tier UI roles (admin, clergy, lay) mapped from 6-tier database roles
- **Consistent Styling**: Embark2-Eric design system integrated across all interfaces

## Prerequisites

- Node.js 18+ and npm/yarn
- Supabase account and project
- Git access to all four repositories
- Environment variables for external services (optional)

## Quick Start

### 1. Clone and Setup Core CRM (Windsurf Project)

```bash
git clone <windsurf-project-repo>
cd windsurf-project
npm install
```

### 2. Environment Configuration

Copy `.env.example` to `.env` and configure:

```bash
# Core Database & Auth
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Multi-Codebase URLs
NEXT_PUBLIC_EMBARK2_ERIC_URL="http://localhost:3001"
NEXT_PUBLIC_SPARK_FELLOWSHIP_URL="http://localhost:3002"
NEXT_PUBLIC_VOCAL_CONNECT_URL="http://localhost:3003"
NEXT_PUBLIC_WINDSURF_PROJECT_URL="http://localhost:3000"
```

### 3. Database Setup

Run the unified schema migrations:

```bash
# Apply all migrations
npm run db:migrate

# Seed initial data (optional)
npm run db:seed
```

### 4. Start Development Server

```bash
npm run dev
```

The core CRM will be available at `http://localhost:3000` with full navigation to external codebases.

## Detailed Setup

### Database Schema Integration

The unified system uses a consolidated Supabase schema that supports:

#### Core Tables
- `profiles` - User profiles with role-based access
- `churches` - Church organizations
- `events`, `groups`, `donations` - Core CRM entities

#### Role System
- **Database Roles**: `ADMIN`, `CLERGY`, `STAFF`, `VOLUNTEER`, `MEMBER`, `VISITOR`
- **UI Categories**: `admin`, `clergy`, `lay`
- **Permission Matrix**: Granular permissions for each feature area

#### Integration Tables
- `church_volunteers` - Vocal Connect volunteer integration
- `member_assistance_cases` - Pastoral care case management
- `agent_definitions` - AI agent configurations

### Authentication Integration

#### Shared Supabase Auth
All codebases share the same Supabase project for authentication:

```typescript
// Each codebase uses the same auth configuration
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)
```

#### Role-Based Access Control
The `AuthContext` provides unified role checking:

```typescript
const { userRole, hasPermission, canAccess } = useAuth()

// Check role-based access
if (userRole === 'admin') { /* admin features */ }

// Check permission-based access
if (hasPermission('crm.members.view')) { /* member management */ }
```

### Navigation System

#### Unified Navigation Structure
The navigation system integrates all codebases:

```typescript
// Navigation automatically filters based on user role and permissions
const navigation = getFilteredNavigation(userRole, profile)

// External URLs are handled automatically
const externalUrl = getExternalUrl('embark2-assessment')
```

#### Cross-Codebase Routing
External navigation items open in new tabs with proper context:

```typescript
// Automatic external URL resolution
<NavigationItem 
  external={true}
  externalUrl={`${process.env.NEXT_PUBLIC_EMBARK2_ERIC_URL}/assessment`}
/>
```

### Styling Integration

#### Embark2-Eric Design System
The unified styling system includes:

```css
/* Journey-themed color palette */
:root {
  --embark-primary: 35 90% 72%;
  --embark-secondary: 350 65% 38%;
  --journey-blue: #47799f;
  --journey-green: #90b4a3;
}

/* Role-based styling */
.role-admin { @apply bg-red-100 text-red-800; }
.role-clergy { @apply bg-blue-100 text-blue-800; }
.role-lay { @apply bg-green-100 text-green-800; }
```

## Deployment

### Production Environment Setup

#### 1. Supabase Production Configuration
```bash
# Production environment variables
SUPABASE_URL="https://your-prod-project.supabase.co"
SUPABASE_ANON_KEY="your-prod-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-prod-service-key"

# Production URLs
NEXT_PUBLIC_EMBARK2_ERIC_URL="https://assessment.yourchurch.org"
NEXT_PUBLIC_SPARK_FELLOWSHIP_URL="https://fellowship.yourchurch.org"
NEXT_PUBLIC_VOCAL_CONNECT_URL="https://pastoral.yourchurch.org"
NEXT_PUBLIC_WINDSURF_PROJECT_URL="https://crm.yourchurch.org"
```

#### 2. Multi-Codebase Deployment Strategy

**Option A: Separate Deployments**
- Deploy each codebase to separate domains/subdomains
- Configure CORS for cross-origin requests
- Use shared Supabase project for data consistency

**Option B: Monorepo Integration**
- Combine codebases into single monorepo
- Use Next.js multi-zone or Nx for build orchestration
- Deploy as single application with internal routing

### Recommended Deployment Platforms

#### Vercel (Recommended)
```bash
# Deploy core CRM
vercel --prod

# Configure environment variables in Vercel dashboard
# Set up custom domains for each codebase
```

#### Docker Deployment
```dockerfile
# Multi-stage build for production
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS runner
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## Testing

### Running the Test Suite

```bash
# Run all tests
npm test

# Run role-based access control tests
npm test tests/integration/role-based-access.test.ts

# Run with coverage
npm run test:coverage
```

### Test Coverage Areas
- ✅ Role mapping and permission system
- ✅ Navigation filtering and routing
- ✅ Authentication and authorization flows
- ✅ Multi-codebase integration
- ✅ Edge cases and error handling

## Troubleshooting

### Common Issues

#### 1. Authentication Not Working
```bash
# Check Supabase configuration
echo $SUPABASE_URL
echo $SUPABASE_ANON_KEY

# Verify database connection
npm run db:test-connection
```

#### 2. External Navigation Not Working
```bash
# Check external URL configuration
echo $NEXT_PUBLIC_EMBARK2_ERIC_URL
echo $NEXT_PUBLIC_SPARK_FELLOWSHIP_URL

# Verify CORS settings in external codebases
```

#### 3. Role-Based Access Issues
```typescript
// Debug role mapping
const { userRole, userPermissions } = useAuth()
console.log('User Role:', userRole)
console.log('Permissions:', userPermissions)
```

### Performance Optimization

#### 1. Navigation Caching
```typescript
// Cache navigation results for better performance
const navigation = useMemo(() => 
  getFilteredNavigation(userRole, profile), 
  [userRole, profile]
)
```

#### 2. Lazy Loading External Components
```typescript
// Lazy load external integrations
const ExternalComponent = lazy(() => import('./ExternalComponent'))
```

## Security Considerations

### Row Level Security (RLS)
All Supabase tables use RLS policies:

```sql
-- Example RLS policy for profiles table
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );
```

### API Security
- All API routes use authentication middleware
- Permission checks on sensitive operations
- Rate limiting on public endpoints

### Cross-Origin Security
- Proper CORS configuration for external codebases
- Secure cookie settings for authentication
- Content Security Policy (CSP) headers

## Maintenance

### Regular Tasks
- Monitor Supabase usage and performance
- Update dependencies across all codebases
- Review and update role permissions as needed
- Test cross-codebase navigation functionality

### Monitoring
- Set up error tracking (Sentry, LogRocket)
- Monitor authentication success rates
- Track navigation usage patterns
- Monitor external codebase availability

## Support

### Documentation
- [Role Permissions System](./src/lib/role-permissions.ts)
- [Unified Navigation](./src/lib/unified-navigation.ts)
- [Authentication Context](./src/contexts/AuthContext.tsx)

### Community
- GitHub Issues for bug reports
- Discord/Slack for community support
- Documentation wiki for additional guides

---

## Quick Reference

### Key Files
- `src/lib/role-permissions.ts` - Role and permission system
- `src/lib/unified-navigation.ts` - Cross-codebase navigation
- `src/contexts/AuthContext.tsx` - Authentication and authorization
- `src/components/layout/RoleBasedSidebar.tsx` - Main navigation component
- `src/components/auth/ProtectedRoute.tsx` - Route protection

### Environment Variables
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Public API key
- `NEXT_PUBLIC_*_URL` - External codebase URLs

### Role Hierarchy
1. **Admin** (`ADMIN`) - Full system access
2. **Clergy** (`CLERGY`) - Pastoral and management features
3. **Lay** (`STAFF`, `VOLUNTEER`, `MEMBER`, `VISITOR`) - Basic member features

This integration provides a seamless, role-based church management experience across multiple specialized codebases while maintaining security, performance, and ease of use.
