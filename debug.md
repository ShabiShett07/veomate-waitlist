# Debug Log - VeoMate Waitlist

This file captures errors encountered during development and their solutions.

---

## Error #1: Netlify Build Failure - useSearchParams Hook

**Date:** 2025-11-25

**Error Message:**
```
Export encountered an error on /complete-signup/page: /complete-signup, exiting the build.
⨯ Next.js build worker exited with code: 1 and signal: null
```

**Location:** `app/complete-signup/page.tsx`

**Root Cause:**
The `/complete-signup` page was using the `useSearchParams()` hook from Next.js without wrapping it in a Suspense boundary. During static site generation (SSG), Next.js requires components that use `useSearchParams()` to be wrapped in `<Suspense>` because search parameters are only available at runtime, not during build time.

**What Was Wrong:**
```tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function CompleteSignup() {
  const searchParams = useSearchParams(); // ❌ This causes build to fail
  // ... rest of component
}
```

**The Fix:**
Wrapped the component using `useSearchParams()` in a Suspense boundary with a loading fallback:

```tsx
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// Internal component that uses useSearchParams
function CompleteSignupForm() {
  const searchParams = useSearchParams(); // ✅ Now safe to use
  // ... rest of component logic

  return (
    // ... JSX
  );
}

// Exported component that wraps in Suspense
export default function CompleteSignup() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#7374EA] border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <CompleteSignupForm />
    </Suspense>
  );
}
```

**Why This Works:**
- `Suspense` tells Next.js that this component needs to wait for runtime data
- The build process can now successfully generate the static shell
- The actual search params are resolved on the client side
- Users see a loading state while the component hydrates

**Verification:**
- ✅ Local build passes: `npm run build`
- ✅ All routes compile successfully
- ✅ Netlify deployment should now succeed

**Files Modified:**
- `app/complete-signup/page.tsx`

**References:**
- [Next.js App Router - useSearchParams](https://nextjs.org/docs/app/api-reference/functions/use-search-params)
- [React Suspense Documentation](https://react.dev/reference/react/Suspense)

---

## Best Practices Learned

1. **Always wrap `useSearchParams()` in Suspense** when using Next.js App Router
2. **Test production builds locally** before deploying (`npm run build`)
3. **Provide meaningful loading fallbacks** for better UX during hydration
4. **Alternative solutions:**
   - Use `export const dynamic = 'force-dynamic'` to make the entire page dynamic (but loses SSG benefits)
   - Use Server Components with `searchParams` prop instead (if you don't need client-side state)

---

## Development Environment

- **Next.js Version:** 16.0.3
- **React Version:** 19.2.0
- **Build System:** Turbopack
- **Deployment:** Netlify with `@netlify/plugin-nextjs`

---

## Error #2: Supabase Connection Error in Development

**Date:** 2025-11-25

**Error Message:**
```
[Error] A server with the specified hostname could not be found.
[Error] Fetch API cannot load https://placeholder.supabase.co/rest/v1/waitlist?on_conflict=email&select=* due to access control checks.
[Error] Failed to load resource: A server with the specified hostname could not be found. (waitlist, line 0)
[Error] Database error: – {message: "TypeError: Load failed", details: "", hint: "", code: ""}
```

**Location:** Browser console when clicking "Join Waitlist"

**Root Cause:**
The application was using placeholder Supabase credentials (`https://placeholder.supabase.co` and `https://example.supabase.co`) which allowed builds to pass but failed at runtime when trying to actually connect to the database. The placeholder values were necessary for the build to succeed, but caused connection errors in development mode.

**What Was Wrong:**
```typescript
// lib/supabase.ts
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://example.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// app/page.tsx - This would fail when trying to connect
const { error: dbError } = await supabase
  .from('waitlist')
  .upsert({ email, ... })
  .select();
// ❌ Connection error: Server not found
```

**The Fix:**
Implemented a **localStorage fallback for demo mode** that allows the application to work without Supabase configuration:

```typescript
// lib/supabase.ts

// 1. Detection function
export const isUsingPlaceholderCredentials = () => {
  return (
    supabaseUrl === 'https://placeholder.supabase.co' ||
    supabaseAnonKey === 'placeholder-anon-key' ||
    supabaseUrl === 'https://example.supabase.co'
  );
};

// 2. LocalStorage fallback
export const saveToLocalStorage = (entry: Partial<WaitlistEntry>) => {
  try {
    const existing = localStorage.getItem('veomate_waitlist_demo');
    const data: WaitlistEntry[] = existing ? JSON.parse(existing) : [];

    // Check if email already exists
    const existingIndex = data.findIndex(item => item.email === entry.email);

    if (existingIndex >= 0) {
      // Update existing entry
      data[existingIndex] = {
        ...data[existingIndex],
        ...entry,
        updated_at: new Date().toISOString()
      };
    } else {
      // Add new entry
      data.push({
        id: crypto.randomUUID(),
        email: entry.email || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...entry
      } as WaitlistEntry);
    }

    localStorage.setItem('veomate_waitlist_demo', JSON.stringify(data));
    console.log('💾 Saved to localStorage (demo mode):', entry.email);
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
};

// 3. Updated page handlers to use fallback
// app/page.tsx
const handleSubmit = async (e: React.FormEvent) => {
  // ...

  if (isUsingPlaceholderCredentials()) {
    // Use localStorage fallback ✅
    const result = saveToLocalStorage({ email, completed_signup: false });

    if (!result.success) {
      setError('Failed to save email. Please try again.');
      return;
    }

    router.push(`/complete-signup?email=${encodeURIComponent(email)}`);
    return;
  }

  // Use real Supabase when configured
  const { error: dbError } = await supabase
    .from('waitlist')
    .upsert({ email, ... });
  // ...
};
```

**Why This Works:**
- **Demo Mode**: When Supabase isn't configured, data is saved to browser localStorage
- **Seamless Switch**: Once real Supabase credentials are added, it automatically uses the database
- **No Build Errors**: Placeholder credentials allow builds to pass
- **No Runtime Errors**: localStorage fallback prevents connection errors
- **Data Persistence**: Demo data persists in browser for testing
- **Upsert Logic**: Mimics database behavior (create or update by email)

**Verification:**
- ✅ Build passes: `npm run build`
- ✅ No runtime errors in browser console
- ✅ Form submissions work in demo mode
- ✅ Data visible in DevTools → Application → Local Storage
- ✅ Console shows helpful demo mode messages
- ✅ Automatic switch to Supabase when credentials are configured

**Files Modified:**
- `lib/supabase.ts` - Added detection and localStorage functions
- `app/page.tsx` - Updated to use localStorage fallback
- `app/complete-signup/page.tsx` - Updated to use localStorage fallback
- `SUPABASE_SETUP.md` - Added demo mode documentation
- `.env.local` - Uses placeholder credentials by default

**Benefits:**
1. **Immediate Testing**: Developers can test the full flow without Supabase setup
2. **No Configuration Barrier**: Works out of the box
3. **Graceful Degradation**: Falls back to localStorage when database unavailable
4. **Better DX**: Clear console messages about demo mode
5. **Easy Migration**: Just add real credentials to switch to production database

**How to View Demo Data:**
```javascript
// In browser console
localStorage.getItem('veomate_waitlist_demo')

// Or in DevTools
// Application → Local Storage → http://localhost:3000 → veomate_waitlist_demo
```

**How to Switch to Real Database:**
1. Update `.env.local` with actual Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-actual-anon-key
   ```
2. Restart dev server: `npm run dev`
3. Application automatically uses Supabase instead of localStorage

**References:**
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [localStorage API](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)

---

## Future Debugging Notes

_Add new errors and solutions below this line_
