'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Firebase imports for authentication and Firestore database
import { useAuth, useFirestore } from '@/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

// UI components from ShadCN for building the form and layout
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Icons } from '@/components/icons';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import type { UserProfile } from '@/lib/types';


// Define the validation schema for the sign-up form using Zod.
// This ensures data integrity before we even send it to Firebase.
const formSchema = z.object({
  fullName: z.string().min(1, 'Full name is required.'),
  email: z.string()
    // Zod's .email() validator is robust and supports Unicode characters.
    .email('Invalid email address.')
    .refine(email => email.endsWith('@neu.edu.ph'), {
        message: 'Please use your official @neu.edu.ph email address to sign up.'
    }),
  password: z.string().min(6, 'Password must be at least 6 characters long.'),
  confirmPassword: z.string(),
  // The final .refine() checks the entire object to ensure the passwords match.
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match.",
  path: ['confirmPassword'], // This puts the error message on the 'confirmPassword' field.
});

export default function SignUpPage() {
  // State to manage the loading status while the form is submitting.
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Essential hooks for Firebase services, page routing, and showing notifications.
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  // Initialize react-hook-form, connecting it with our Zod schema for validation.
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  // This function handles the entire submission process.
  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true); // Disable the button to prevent multiple submissions.
    try {
      // Step 1: Create the user account in Firebase Authentication.
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;

      // Step 2: Create a corresponding user profile document in Firestore.
      // We use Omit to create a type based on UserProfile but without 'createdAt' and 'college',
      // as we will set them manually.
      const userProfile: Omit<UserProfile, 'createdAt' | 'college'> = {
        id: user.uid,        // The unique ID from Firebase Auth is the document ID.
        name: values.fullName,
        email: values.email,
        role: 'user',        // All new sign-ups are standard users by default.
        isBlocked: false,    // New users are not blocked by default.
      };

      // Set the document in the 'users' collection with the user's UID as the key.
      await setDoc(doc(firestore, 'users', user.uid), {
        ...userProfile,
        college: '', // The college is initially empty and can be updated later.
        createdAt: serverTimestamp(), // Use a server-side timestamp for accuracy.
      });

      // Step 3: Provide positive feedback to the user.
      toast({
        variant: 'success',
        title: 'Account created successfully!',
        description: 'Welcome to NEU Library.',
      });

      // Step 4: Redirect to the main dashboard or check-in page.
      router.push('/');

    } catch (error: any) {
      // Handle potential errors from Firebase.
      console.error('Sign up error:', error);
      let errorMessage = 'An unexpected error occurred. Please try again.';
      // Provide a more specific error message if the email is already in use.
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email address is already in use.';
      }
      toast({
        variant: 'destructive',
        title: 'Sign Up Failed',
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false); // Re-enable the button.
    }
  }

  return (
    // Main container for the page, centering the sign-up card.
    <div className="flex min-h-screen items-center justify-center bg-secondary p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <Icons.logo className="h-16 w-16 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Create an Account</CardTitle>
          <CardDescription>Join the NEU Library Visitor Tracker System.</CardDescription>
        </CardHeader>
        <CardContent>
          {/* The FormProvider that connects react-hook-form to our components. */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              {/* Full Name Field */}
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Juana Dela Cruz" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Email Field */}
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

              {/* Password Field */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Confirm Password Field */}
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Submit Button with loading spinner */}
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Create Account
              </Button>
            </form>
          </Form>

          {/* Link to the login page for existing users. */}
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
