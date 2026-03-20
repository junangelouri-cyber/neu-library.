'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { SidebarTrigger } from '@/components/ui/sidebar';
import type { UserProfile } from '@/lib/types';
import { Icons } from '@/components/icons';
import Link from 'next/link';

/**
 * Header component for the main application layout.
 * Displays the app title, user information, and action buttons.
 * It now conditionally renders different buttons for guests versus logged-in users.
 * @param {object} props - Component props.
 * @param {UserProfile | null} props.user - The profile of the logged-in user, or null for guests.
 * @param {boolean} props.isGuest - Flag indicating if the user is in guest mode.
 */
export function Header({ user, isGuest }: { user: UserProfile | null; isGuest: boolean }) {
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({
        variant: 'success',
        title: 'Logout Successful',
        description: 'You have been successfully logged out.',
      });
      router.push('/login');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Logout Failed',
        description: 'An error occurred during logout. Please try again.',
      });
    }
  };

  const handleSignIn = async () => {
    try {
      await signOut(auth); // Ensure any anonymous session is terminated
      router.push('/login');
    } catch (error) {
        toast({
            variant: 'destructive',
            title: 'Operation Failed',
            description: 'Could not proceed to sign in. Please try again.',
          });
    }
  };
  
  const displayName = isGuest ? 'Guest' : user?.name;

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background px-4 md:px-6">
      
      <div className="flex items-center gap-4">
        <SidebarTrigger className="md:hidden" />
        
        <Link href="/" className="hidden items-center gap-2 md:flex">
          <Icons.logo className="h-6 w-6 text-primary" />
          <span className="font-semibold">NEU Library Visitor Tracker</span>
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <span className="hidden text-sm font-medium text-foreground sm:block">
          Welcome, {displayName}
        </span>
        
        {isGuest ? (
           <Button
            onClick={handleSignIn}
            className="bg-primary text-primary-foreground transition-transform hover:scale-105 hover:bg-primary/90 active:scale-95"
            size="sm"
          >
            Sign In / Sign Up
          </Button>
        ) : (
          <>
            <Button
              onClick={handleSignIn}
              className="bg-secondary text-secondary-foreground transition-transform hover:scale-105 hover:bg-secondary/90 active:scale-95"
              size="sm"
            >
              Change User
            </Button>

            <Button
              onClick={handleLogout}
              className="bg-primary text-primary-foreground transition-transform hover:scale-105 hover:bg-primary/90 active:scale-95"
              size="sm"
            >
              Logout
            </Button>
          </>
        )}
      </div>
    </header>
  );
}
