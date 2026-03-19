'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useUser, useAuth, useFirestore } from '@/firebase';
import { GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, signInAnonymously, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

// UI imports
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Icons } from '@/components/icons';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/lib/types';
import { Loader2, QrCode } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { QRCodeScanner } from '@/components/QRCodeScanner';
import { Label } from '@/components/ui/label';

// Define the Zod validation schema for the login form.
const formSchema = z.object({
  email: z.string().email('Invalid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

export default function LoginPage() {
  // loading state for the whole page (auth check)
  const { user: authUser, isUserLoading: authLoading } = useUser();
  // isSubmitting state for form submissions
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionMethod, setSubmissionMethod] = useState<'email' | 'google' | 'guest' | null>(null);
  const [showScanner, setShowScanner] = useState(false);

  // State for the forgot password dialog
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  // Initialize react-hook-form with the Zod schema.
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Handle email & password sign-in.
  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    setSubmissionMethod('email');
    try {
      // Attempt to sign in with Firebase Authentication.
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      const fbUser = userCredential.user;

      // Domain validation: Check if email is NOT from NEU domain
      if (fbUser.email && !fbUser.email.endsWith('@neu.edu.ph')) {
        const userRef = doc(firestore, 'users', fbUser.uid);
        const docSnap = await getDoc(userRef);
        // If the user profile doesn't exist or the role is not 'admin', block login.
        if (!docSnap.exists() || docSnap.data().role !== 'admin') {
          await signOut(auth); // Sign out the user
          toast({
            variant: 'destructive',
            title: 'Authentication Failed',
            description: 'Please use your official @neu.edu.ph email address.',
          });
          return; // Stop execution
        }
      }

      toast({
        variant: 'success',
        title: 'Welcome back to NEU Library!',
      });
      router.push('/'); // Redirect on successful login
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Authentication Failed',
        description: 'Invalid email or password. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
      setSubmissionMethod(null);
    }
  }

  // Handle Google Sign-In.
  const signInWithGoogle = async () => {
    setIsSubmitting(true);
    setSubmissionMethod('google');
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const fbUser = result.user;

      // Domain validation: Check if email is NOT from NEU domain
      if (fbUser.email && !fbUser.email.endsWith('@neu.edu.ph')) {
        const userRef = doc(firestore, 'users', fbUser.uid);
        const docSnap = await getDoc(userRef);
        // If the user profile doesn't exist or the role is not 'admin', block login.
        if (!docSnap.exists() || docSnap.data().role !== 'admin') {
          await signOut(auth); // Sign out the user
          toast({
            variant: 'destructive',
            title: 'Authentication Failed',
            description: 'Please use your official @neu.edu.ph email address.',
          });
          return; // Stop execution
        }
      }

      // If validation passes, check for profile and create if new.
      const userRef = doc(firestore, 'users', fbUser.uid);
      const docSnap = await getDoc(userRef);

      if (!docSnap.exists()) {
        const newUserProfile: Omit<UserProfile, 'createdAt' | 'college'> = {
          id: fbUser.uid,
          name: fbUser.displayName || 'New User',
          email: fbUser.email || '',
          role: 'user',
          isBlocked: false,
        };
        await setDoc(userRef, {
          ...newUserProfile,
          college: '',
          createdAt: serverTimestamp(),
        });
      }
      
      toast({
        variant: 'success',
        title: 'Signed in successfully!',
      });
      router.push('/'); // Redirect on successful login

    } catch (error) {
      console.error('Error signing in with Google:', error);
      toast({
        variant: 'destructive',
        title: 'Authentication Failed',
        description: 'Could not sign in with Google. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
      setSubmissionMethod(null);
    }
  };

  // Handle Guest Sign-In (Anonymous Authentication)
  const signInAsGuest = async () => {
    setIsSubmitting(true);
    setSubmissionMethod('guest');
    try {
      await signInAnonymously(auth);
      toast({
        variant: 'success',
        title: 'Welcome, Guest!',
        description: 'You are now in guest mode.',
      });
       router.push('/'); // Redirect guest on successful login
    } catch (error) {
      console.error('Error signing in as guest:', error);
      toast({
        variant: 'destructive',
        title: 'Guest Mode Failed',
        description: 'Could not start a guest session. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
      setSubmissionMethod(null);
    }
  };

  // Handle sending a password reset email.
  async function handlePasswordReset() {
    const trimmedEmail = resetEmail.trim();
    if (!trimmedEmail) {
      toast({
        variant: 'destructive',
        title: 'Email Required',
        description: 'Please enter your email address.',
      });
      return;
    }
    setIsResetting(true);
    try {
      await sendPasswordResetEmail(auth, trimmedEmail);
      toast({
        variant: 'success',
        title: 'Reset Link Sent',
        description: 'Please check your email inbox for the password reset link.',
      });
      setIsResetDialogOpen(false); // Close the dialog on success
      setResetEmail(''); // Clear the email field
    } catch (error: any) {
      console.error('Password reset error:', error);
      let description = 'An unexpected error occurred. Please try again.';
      // Give a more specific error if the user is not found.
      if (error.code === 'auth/user-not-found') {
        description = 'This email is not registered in our system.';
      }
      toast({
        variant: 'destructive',
        title: 'Password Reset Failed',
        description,
      });
    } finally {
      setIsResetting(false);
    }
  }


  // Redirect the user to the main app page if they are already logged in.
  // The main page handles role-based redirection (admin vs. user).
  useEffect(() => {
    if (authUser) {
      router.push('/');
    }
  }, [authUser, router]);

  // Show a loading skeleton while checking the initial auth state.
  if (authLoading || authUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-full" />
          </CardHeader>
          <CardContent className="grid gap-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <Dialog open={showScanner} onOpenChange={setShowScanner}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Scan QR Code</DialogTitle>
            <DialogDescription>
              Point your camera at the QR code posted at the library entrance.
            </DialogDescription>
          </DialogHeader>
          <QRCodeScanner onScanSuccess={() => setShowScanner(false)} />
        </DialogContent>
      </Dialog>
      
      <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Forgot Password</DialogTitle>
            <DialogDescription>
              Enter your registered email address and we'll send you a link to reset your password.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid w-full items-center gap-2">
              <Label htmlFor="reset-email">Email Address</Label>
              <Input
                id="reset-email"
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="your.email@example.com"
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handlePasswordReset} disabled={isResetting} className="w-full">
              {isResetting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Reset Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex min-h-screen items-center justify-center bg-secondary p-4">
        <Card className="w-full max-w-sm shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <Icons.logo className="h-16 w-16 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">NEU Library Visitor Tracker</CardTitle>
            <CardDescription>Sign in with your institutional @neu.edu.ph account.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            {/* Email and Password Form */}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input placeholder="your.email@neu.edu.ph" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                         <FormLabel>Password</FormLabel>
                         <Button
                           type="button"
                           variant="link"
                           className="h-auto p-0 text-sm font-medium text-primary hover:underline"
                           onClick={() => setIsResetDialogOpen(true)}
                         >
                           Forgot Password?
                         </Button>
                       </div>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting && submissionMethod === 'email' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Sign In
                </Button>
              </form>
            </Form>

            {/* "Or continue with" separator */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>

            {/* Social and Guest Login Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={signInWithGoogle} className="w-full" disabled={isSubmitting}>
                {isSubmitting && submissionMethod === 'google' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Icons.google className="mr-2 h-4 w-4" />}
                Google
              </Button>
               <Button variant="outline" onClick={() => setShowScanner(true)} className="w-full" disabled={isSubmitting}>
                  <QrCode className="mr-2 h-4 w-4" />
                Scan QR
              </Button>
            </div>
              <Button variant="secondary" onClick={signInAsGuest} className="w-full" disabled={isSubmitting}>
                {isSubmitting && submissionMethod === 'guest' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Continue as Guest
              </Button>
            
            {/* Link to Sign Up page */}
            <p className="text-center text-sm text-muted-foreground">
              Don't have an account?{' '}
              <Link href="/signup" className="font-semibold text-primary hover:underline">
                Sign up
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
