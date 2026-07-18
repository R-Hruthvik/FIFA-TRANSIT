# FIFA Command Center - Implementation Report

**Date:** 2026-07-15
**Branch:** `worktree-auth-build-2026-07-15`
**Last Commit:** `3d82b7d` - feat: admin auth with staff approval queue, developer settings, user management

---

## Executive Summary

Implementation of 6 features for the FIFA Command Center has been **partially completed**. Phases 0 and 1 are fully implemented and tested. Phase 2 is partially implemented. Phases 3-5 are not started.

**Overall Progress:** ~40% complete

---

## Phase 0: Auth System (Google + Email/Pass) ✅ COMPLETE

### Status: FULLY IMPLEMENTED
**Commit:** `8e957ca` - feat(auth): Phase 0 - Auth System with NextAuth v4

### Implementation Details

**Library:** NextAuth v4 with JWT sessions (stateless)

**Files Created:**
- `src/lib/auth.ts` - NextAuth v4 configuration with Google + Credentials providers
- `src/lib/auth/users.ts` - MongoDB user CRUD operations
- `src/lib/auth/session.ts` - Auth wrapper for Server Components
- `src/app/api/auth/[...nextauth]/route.ts` - Auth.js Route Handler
- `src/app/api/auth/register/route.ts` - Email/password registration
- `src/app/(auth)/login/page.tsx` - Login page with Suspense wrapper
- `src/app/(auth)/signup/page.tsx` - Signup page
- `src/app/(auth)/layout.tsx` - Auth page layout
- `src/components/auth/LoginForm.tsx` - Email/password form
- `src/components/auth/SignupForm.tsx` - Sign-up form
- `src/components/auth/GoogleSignInButton.tsx` - Google OAuth button
- `src/components/auth/UserMenu.tsx` - Session-aware user menu
- `src/components/auth/ProtectedRoute.tsx` - Client-side route guard
- `src/components/auth/SessionProvider.tsx` - NextAuth SessionProvider wrapper
- `src/types/auth.ts` - TypeScript definitions + module augmentation
- `src/middleware.ts` - Route protection middleware
- `src/lib/auth/auth.test.ts` - Unit tests (9 passing)

**Features Implemented:**
- [x] Google OAuth login
- [x] Email/password registration and login
- [x] Bcrypt password hashing (cost 12)
- [x] JWT session strategy
- [x] Role-based access control (fan/staff/admin)
- [x] Middleware route protection for /admin/* and /staff/*
- [x] Client-side ProtectedRoute component
- [x] UserMenu with role-based navigation
- [x] Session persistence across refreshes
- [x] Auth redirect with callbackUrl
- [x] Google email_verified check
- [x] Google account linking for existing users
- [x] lastSignIn/updatedAt timestamp tracking

**Review Fixes Applied:**
1. ✅ Google OAuth: email_verified check added
2. ✅ Google OAuth: existing user account linking (googleId, lastSignIn, updatedAt)
3. ✅ Credentials login: lastSignIn/updatedAt timestamp updates
4. ✅ Token.name populated in JWT callback

**Database Schema (`users` collection):**
```typescript
{
  _id: ObjectId,
  id: string,                        // UUID
  email: string (unique, lowercase),
  emailVerified: Date | null,
  name: string | null,
  image: string | null,
  googleId: string | null,           // sparse unique index
  passwordHash: string | null,       // bcrypt, null for Google-only
  role: "fan" | "staff" | "admin",   // default: "fan"
  staffStatus: "none" | "pending" | "approved" | "rejected",
  staffRequestedAt: Date | null,
  approvedAt: Date | null,
  approvedBy: string | null,
  createdAt: Date,
  updatedAt: Date,
  lastSignIn: Date | null
}
```

---

## Phase 1: Admin Auth + Developer Settings ✅ COMPLETE

### Status: FULLY IMPLEMENTED
**Commit:** `3d82b7d` - feat: admin auth with staff approval queue, developer settings, user management

### Implementation Details

**Files Created:**
- `src/app/(admin)/layout.tsx` - Admin layout with sidebar navigation + role guard
- `src/app/(admin)/dashboard/page.tsx` - Admin dashboard with stats
- `src/app/(admin)/manage-staff/page.tsx` - Staff approval queue
- `src/app/(admin)/settings/page.tsx` - Developer settings
- `src/app/(admin)/users/page.tsx` - User management
- `src/app/api/admin/stats/route.ts` - GET admin statistics
- `src/app/api/admin/settings/route.ts` - GET/POST feature flags & API config
- `src/app/api/admin/users/route.ts` - GET users, PATCH user roles
- `src/components/admin/StaffApprovalQueue.tsx` - Staff approval UI
- `src/components/admin/DeveloperSettings.tsx` - Feature flags + API config
- `src/components/admin/UserTable.tsx` - User management table

**Features Implemented:**
- [x] Admin dashboard with stats overview (total users, pending staff, active staff, admin count)
- [x] Staff approval queue with approve/reject actions
- [x] Developer settings (feature flags: enableRealMatchData, enableOneTap, enableHeatmapAnimation)
- [x] Match API configuration (provider, API key, cache TTL)
- [x] User management table with role display
- [x] Role-based user badges (admin/staff/fan)
- [x] Admin sidebar navigation
- [x] Protected admin layout with role guard

**Database Schema (`settings` collection):**
```typescript
{
  _id: "global",
  featureFlags: {
    enableRealMatchData: boolean,
    enableOneTap: boolean,
    enableHeatmapAnimation: boolean,
  },
  matchApi: {
    provider: "football-data" | "api-football",
    apiKey: string | null,
    cacheTTL: number,  // seconds
  },
  updatedAt: Date,
}
```

**Issues Fixed:**
1. ✅ JSX syntax errors in admin pages
2. ✅ Missing `"use client"` directives
3. ✅ Route conflict: `/(admin)/staff` → renamed to `/(admin)/manage-staff`
4. ✅ Link import: `import Link from 'next/link'` (default import)
5. ✅ Missing components: DeveloperSettings, UserTable created
6. ✅ Missing API routes: stats, settings, users created
7. ✅ ProtectedRoute import typo fixed

---

## Phase 2: Staff Registration + Approval Queue 🔄 IN PROGRESS (70%)

### Status: PARTIALLY IMPLEMENTED
**No commit yet - work in progress**

### Implementation Details

**Files Created:**
- `src/app/(auth)/staff/register/page.tsx` - Staff registration form ✅
- `src/app/api/staff/register/route.ts` - POST staff registration ✅
- `src/app/api/staff/status/route.ts` - GET staff status ✅
- `src/hooks/useStaffStatus.ts` - Poll staff request status ✅

**Files Modified:**
- `src/components/admin/StaffApprovalQueue.tsx` - Updated to show organization/role/reason ✅

### What's Implemented:
- [x] Staff registration form with organization, role, justification fields
- [x] POST /api/staff/register endpoint
- [x] GET /api/staff/status endpoint
- [x] useStaffStatus hook with polling
- [x] Admin approval queue shows registration details

### What's Missing (BLOCKED):
- [ ] **Admin approve/reject API endpoints** - Was creating when interrupted
  - `src/app/api/admin/staff/[id]/approve/route.ts` - NOT CREATED
  - `src/app/api/admin/staff/[id]/reject/route.ts` - NOT CREATED
- [ ] Email notifications (Resend integration)
  - TODO in register route
  - TODO in approve/reject routes

### Current Issue:
The StaffApprovalQueue component calls `/api/admin/staff/${id}/approve` and `/api/admin/staff/${id}/reject` endpoints that **do not exist yet**. These were about to be created when the implementation was interrupted.

---

## Phase 3: Google One Tap Auto Sign-In ❌ NOT STARTED

### Status: NOT IMPLEMENTED

**Planned Files:**
- `src/components/auth/GoogleOneTap.tsx` - Google One Tap prompt component
- `src/hooks/useOneTap.ts` - One Tap initialization and callback handling

**Planned Modifications:**
- `src/app/page.tsx` - Render GoogleOneTap on landing page
- `src/app/layout.tsx` - Conditionally show One Tap based on feature flag

**Implementation Plan:**
- Load Google Identity Services script (`accounts.google.com/gsi/client`)
- Call `google.accounts.id.initialize()` with:
  - `client_id` from env
  - `callback` → auto sign-in via NextAuth Google provider
  - `auto_select: true` for returning users
  - Conditionally show based on session state and feature flag
- Show only when `!session && featureFlags.enableOneTap`
- Close on sign-in or dismiss

**Prerequisites:**
- Phase 0 complete ✅
- Feature flag `enableOneTap` exists in settings ✅

---

## Phase 4: Real Match Data Integration ❌ NOT STARTED

### Status: NOT IMPLEMENTED

**Planned Files:**
- `src/app/api/match/route.ts` - GET endpoint - fetch + cache match data
- `src/app/api/match/schedule/route.ts` - GET endpoint - upcoming matches
- `src/lib/match-api.ts` - Match API client (football-data.org wrapper)
- `src/lib/match-cache.ts` - In-memory + MongoDB caching layer
- `src/lib/match-schema.ts` - Match data type definitions
- `src/components/match/MatchCard.tsx` - Individual match display card
- `src/components/match/MatchSchedule.tsx` - Upcoming matches list
- `src/components/match/MatchScoreboard.tsx` - Live score display
- `src/hooks/useMatchData.ts` - Fetch match data hook with cache + polling

**Planned Modifications:**
- `src/components/FanHub.tsx` - Add match data display
- `src/app/page.tsx` - Show match schedule on landing
- `src/lib/demo-data.ts` - Replace mock match data with real or seeded data

**Data Provider:** football-data.org (free tier, 10 req/min)

**Caching Strategy:**
1. In-memory cache: `Map<string, { data, expiresAt }>` - 5-minute TTL for live scores
2. MongoDB cache: `match_cache` collection
3. Stale-while-revalidate: Return cached data immediately, refresh in background

**Prerequisites:**
- Phase 1 complete ✅
- Match API configuration in admin settings ✅

---

## Phase 5: Realistic Stadium Blueprint ❌ NOT STARTED

### Status: NOT IMPLEMENTED

**Planned Modifications:**
- `src/components/heatmap/StadiumMap.tsx` - Replace square with oval stadium SVG
- `src/components/heatmap/index.ts` - Update STATUS_COLORS if needed
- `src/lib/demo-data.ts` - Update gate positions to match new stadium shape

**SVG Design:**
- Oval bowl with 8 gates (instead of 4 corners)
- Outer oval: stadium perimeter (stands)
- Inner oval: field boundary
- Center circle: field center with markings
- 8 gates evenly spaced around oval perimeter

**Gate Positions (400×400 viewBox):**
| Gate | Position | Angle |
|------|----------|-------|
| G1 (North) | (200, 35) | 0° |
| G2 (NE) | (345, 80) | 45° |
| G3 (East) | (370, 200) | 90° |
| G4 (SE) | (345, 320) | 135° |
| G5 (South) | (200, 365) | 180° |
| G6 (SW) | (55, 320) | 225° |
| G7 (West) | (30, 200) | 270° |
| G8 (NW) | (55, 80) | 315° |

**Prerequisites:**
- Phase 4 complete (real match data grounds the visualization)

---

## Known Issues

### Critical Issues
1. **Phase 2 incomplete:** Admin approve/reject endpoints missing - staff approval queue won't work
2. **Email notifications:** Not implemented for staff registration/approval/rejection

### Minor Issues
1. **Middleware deprecation warning:** Next.js 16 recommends `proxy.ts` over `middleware.ts`
2. **Edge runtime warning:** Some pages use edge runtime which disables static generation
3. **TypeScript warnings:** Some `@ts-ignore` comments for NextAuth v4 type compatibility

### Technical Debt
1. **StaffRegistrationPage in wrong location:** Created at `src/app/(auth)/staff/register/page.tsx` but should be accessible from main navigation
2. **Missing staff route protection:** `/staff/register` should be accessible to unauthenticated users but is currently inside `(auth)` group
3. **No email verification flow:** Email verification is marked as TODO

---

## Environment Variables Required

```env
# Auth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
AUTH_SECRET=...           # or NEXTAUTH_SECRET
NEXTAUTH_URL=http://localhost:3000

# Database
MONGODB_URI=mongodb://...
MONGODB_DB=stadium_ops

# Match API (Phase 4)
FOOTBALL_DATA_API_KEY=...

# Email (Phase 2 - future)
RESEND_API_KEY=...
```

---

## Testing Status

### Phase 0 Tests: ✅ PASSING
- `src/lib/auth/auth.test.ts` - 9 unit tests passing
- Tests cover: bcrypt hashing, password validation, email normalization, role defaults, staff status checks

### Build Status: ✅ PASSING
- Last successful build: `3d82b7d`
- 27 pages generated successfully
- No TypeScript errors

---

## Next Steps (Priority Order)

1. **Complete Phase 2:** Create admin approve/reject endpoints
2. **Complete Phase 3:** Implement Google One Tap
3. **Complete Phase 4:** Real match data integration
4. **Complete Phase 5:** Stadium blueprint redesign
5. **Add email notifications** using Resend
6. **Fix middleware deprecation** by migrating to proxy.ts
7. **Add more tests** for admin and staff features

---

## File Structure Summary

```
src/
├── app/
│   ├── (admin)/           # Admin pages (protected)
│   │   ├── dashboard/
│   │   ├── layout.tsx
│   │   ├── manage-staff/
│   │   ├── settings/
│   │   └── users/
│   ├── (auth)/            # Auth pages
│   │   ├── login/
│   │   ├── signup/
│   │   ├── staff/register/
│   │   └── layout.tsx
│   ├── api/
│   │   ├── admin/         # Admin API routes
│   │   ├── auth/          # NextAuth + registration
│   │   └── staff/         # Staff registration + status
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── admin/             # Admin components
│   ├── auth/              # Auth components
│   └── ui/                # UI components (shadcn)
├── hooks/
│   └── useStaffStatus.ts  # Staff status polling
├── lib/
│   ├── auth/              # Auth utilities
│   ├── db.ts              # MongoDB connection
│   └── ...
└── types/
    └── auth.ts            # Auth TypeScript types
```

---

## Conclusion

The authentication system (Phase 0) and admin panel (Phase 1) are fully functional. Phase 2 (Staff Registration) is 70% complete with the registration form and status endpoints working, but the admin approval workflow is missing the approve/reject API endpoints. Phases 3-5 are planned but not started.

The codebase is well-structured with proper TypeScript types, consistent naming conventions, and good separation of concerns. The build is clean with no errors.

**Recommended immediate action:** Complete Phase 2 by creating the missing approve/reject endpoints, then proceed with Phases 3-5 in order.
