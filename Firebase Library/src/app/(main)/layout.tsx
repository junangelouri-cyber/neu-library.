'use client';

import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarInset,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { SidebarNav } from '@/components/layout/SidebarNav';
import { Toaster } from '@/components/ui/toaster';
import { doc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { Header } from '@/components/layout/Header';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user: authUser, isUserLoading: authLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const pathname = usePathname();
  
  const userProfileRef = useMemoFirebase(() => 
    (authUser && !authUser.isAnonymous) ? doc(firestore, 'users', authUser.uid) : null,
    [firestore, authUser]
  );
  const { data: user, isLoading: profileLoading } = useDoc<UserProfile>(userProfileRef);

  const loading = authLoading || (authUser && !authUser.isAnonymous && profileLoading);

  useEffect(() => {
    // Wait until all authentication and profile loading is complete.
    if (loading) {
      return;
    }

    // If there is no authenticated user at all (not even a guest),
    // they must be sent to the login page.
    if (!authUser) {
      router.replace('/login');
      return;
    }

    const isAdmin = user?.role === 'admin';

    // This is the core logic for role-based redirection.
    // It runs when the user lands on the root path ('/'), which happens
    // immediately after a successful login.
    if (pathname === '/') {
      if (isAdmin) {
        // Admins are immediately redirected to the statistics dashboard.
        router.replace('/admin/statistics');
      } else {
        // Regular users and guests are sent to the check-in form.
        router.replace('/check-in');
      }
    }
  }, [authUser, user, loading, router, pathname]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  const handleBlockLogout = async () => {
    const { getAuth, signOut } = await import('firebase/auth');
    const auth = getAuth();
    await signOut(auth);
    router.push('/login');
  }

  // Blocked users (non-guests) are redirected
  if (user && user.isBlocked) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 p-4 text-center">
        <h1 className="text-2xl font-bold text-destructive">Account Blocked</h1>
        <p className="max-w-md text-muted-foreground">
          Your account has been blocked by an administrator. Please contact
          support for further assistance.
        </p>
        <Button onClick={handleBlockLogout} variant="destructive">
          Log Out
        </Button>
      </div>
    );
  }

  const isGuest = !user;
  const role = isGuest ? 'guest' : user?.role;
  const isAdminRoute = pathname.startsWith('/admin');

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarContent>
          {role && <SidebarNav role={role} />}
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <div className="absolute top-0 left-0 -z-10 h-full w-full bg-background">
          {!isAdminRoute && (
            <>
            <div className="absolute bottom-0 left-[-20%] right-0 top-[-10%] h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle_farthest-side,rgba(16,185,129,0.15),rgba(255,255,255,0))]"></div>
            <div className="absolute bottom-0 right-[-20%] top-[-10%] h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle_farthest-side,rgba(16,185,129,0.15),rgba(255,255,255,0))]"></div>
            </>
          )}
        </div>
        <Header user={user} isGuest={isGuest} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
          <Toaster />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
