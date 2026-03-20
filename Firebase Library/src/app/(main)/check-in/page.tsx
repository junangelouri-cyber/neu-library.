'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle, BookOpen } from 'lucide-react';
import { collection, addDoc, serverTimestamp, query, where, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import type { College, UserProfile, Purpose, Visit } from '@/lib/types';


const educationLevels = ['Undergraduate', 'Graduate Studies'];
const visitorTypes = ['Student', 'Employee'];


// Updated Zod schema with conditional validation for both college and purpose.
const formSchema = z.object({
  fullName: z.string().min(1, 'Full name is required.'),
  visitorType: z.string({ required_error: 'Please select a visitor type.' }).min(1, 'Please select a visitor type.'),
  studentNumber: z.string().optional(),
  educationLevel: z.string().optional(),
  college: z.string().optional(),
  otherCollege: z.string().optional(),
  purposeOfVisit: z.string().min(1, 'Please select a purpose for your visit.'),
  otherPurpose: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.visitorType === 'Student') {
    if (!data.studentNumber || data.studentNumber.trim().length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['studentNumber'],
        message: 'Student number is required for students.',
      });
    } else if (!data.studentNumber.includes('-')) {
       ctx.addIssue({
        code: 'custom',
        path: ['studentNumber'],
        message: "Invalid Student Number. Please include a dash (-) in the format (example: 2023-12345).",
      });
    }

    if (!data.educationLevel) {
      ctx.addIssue({
        code: 'custom',
        path: ['educationLevel'],
        message: 'Please select an education level.',
      });
    }

    if (!data.college) {
      ctx.addIssue({
        code: 'custom',
        path: ['college'],
        message: 'Please select your college/program.',
      });
    } else if (data.college === 'Other' && (!data.otherCollege || data.otherCollege.trim() === '')) {
      ctx.addIssue({
        code: 'custom',
        path: ['otherCollege'],
        message: 'Please specify your college/program.',
      });
    }
  }

  if (data.purposeOfVisit === 'Other' && (!data.otherPurpose || data.otherPurpose.trim() === '')) {
    ctx.addIssue({
      code: 'custom',
      path: ['otherPurpose'],
      message: 'Please specify your purpose of visit.',
    });
  }
});

// A dialog component to show a success message after a successful check-in.
const CheckInSuccessDialog = ({ open, onOpenChange, visitData, isGuest }) => {
  const router = useRouter();

  // Automatically redirects the user after 5 seconds.
  // Guests are sent back to the check-in page, logged-in users to their history.
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        onOpenChange(false);
        if (!isGuest) {
          router.push('/history');
        }
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [open, onOpenChange, router, isGuest]);

  const handleProceed = () => {
    onOpenChange(false);
    if (!isGuest) {
      router.push('/history');
    }
  }

  if (!visitData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md text-center p-8">
        <DialogHeader>
          <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in-95">
            <CheckCircle className="h-20 w-20 text-green-500" />
            <DialogTitle className="text-2xl font-bold">Welcome to NEU Library!</DialogTitle>
            <DialogDescription>
              Your visit has been successfully recorded. Enjoy your time!
            </DialogDescription>
          </div>
        </DialogHeader>
        <div className="text-sm bg-muted p-4 rounded-md w-full my-4">
          <div className="font-semibold">{visitData.fullName}</div>
          <div>{visitData.date}</div>
          <div>{visitData.time}</div>
        </div>
        <Button onClick={handleProceed} className="w-full bg-green-600 hover:bg-green-700 text-white transition-transform hover:scale-105">
          {isGuest ? 'Done' : 'View My History'}
        </Button>
      </DialogContent>
    </Dialog>
  );
};


export default function CheckInPage() {
  const { user: authUser, isUserLoading: authLoading } = useUser();
  const firestore = useFirestore();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [visitData, setVisitData] = useState(null);
  const { toast } = useToast();

  const undergraduateQuery = useMemoFirebase(() => (firestore && authUser) ? query(collection(firestore, 'colleges'), where('level', '==', 'Undergraduate')) : null, [firestore, authUser]);
  const { data: undergraduateCollegesData, isLoading: undergradLoading } = useCollection<College>(undergraduateQuery);
  
  const graduateQuery = useMemoFirebase(() => (firestore && authUser) ? query(collection(firestore, 'colleges'), where('level', '==', 'Graduate Studies')) : null, [firestore, authUser]);
  const { data: graduateProgramsData, isLoading: gradLoading } = useCollection<College>(graduateQuery);

  // This fetch is preserved as per instructions but its result is not used for the purpose dropdown.
  const purposeQuery = useMemoFirebase(() => (firestore && authUser) ? collection(firestore, 'purposeOfVisits') : null, [firestore, authUser]);
  const { data: purposesData, isLoading: purposeLoading } = useCollection<Purpose>(purposeQuery);

  const userProfileRef = useMemoFirebase(() => (authUser && !authUser.isAnonymous) ? doc(firestore, 'users', authUser.uid) : null, [firestore, authUser]);
  const { data: userProfile, isLoading: profileLoading } = useDoc<UserProfile>(userProfileRef);

  const { undergraduateColleges, graduateStudies } = useMemo(() => {
    const undergraduateColleges = undergraduateCollegesData ? [...undergraduateCollegesData.map(c => c.name).sort(), 'Other'] : ['Other'];
    const graduateStudies = graduateProgramsData ? [...graduateProgramsData.map(p => p.name).sort(), 'Other'] : ['Other'];
    return { undergraduateColleges, graduateStudies };
  }, [undergraduateCollegesData, graduateProgramsData]);

  // Static list of purposes as requested.
  const purposeOptions = [
    'Study / Review',
    'Research',
    'Borrow / Return Books',
    'Use Computer / Internet',
    'Group Activity / Project',
    'Other',
  ];

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: '',
      visitorType: 'Student',
      studentNumber: '',
      educationLevel: undefined,
      college: undefined,
      otherCollege: '',
      purposeOfVisit: '',
      otherPurpose: '',
    },
  });

  useEffect(() => {
    if (userProfile) {
      form.setValue('fullName', userProfile.name);
    }
  }, [userProfile, form]);
  
  const watchedEducationLevel = form.watch('educationLevel');
  const watchedCollege = form.watch('college');
  const watchedVisitorType = form.watch('visitorType');
  const watchedPurposeOfVisit = form.watch('purposeOfVisit');

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!authUser) {
      toast({
        variant: 'destructive',
        title: 'Not authenticated',
        description: 'You must be logged in to check in.',
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const now = new Date();
      const isGuest = authUser.isAnonymous;
      const method = searchParams.get('method') === 'qr_code' ? 'qr_code' : 'web';

      const newVisitData: Partial<Visit> = {
        userId: authUser.uid,
        fullName: values.fullName,
        visitorType: values.visitorType as 'Student' | 'Employee',
        purposeOfVisitName: values.purposeOfVisit === 'Other' ? values.otherPurpose! : values.purposeOfVisit,
        date: now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric'}),
        time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
        isGuest: isGuest,
        method: method,
      };

      if (values.visitorType === 'Student') {
        newVisitData.studentNumber = values.studentNumber;
        newVisitData.educationLevel = values.educationLevel;
        newVisitData.collegeName = values.college === 'Other' ? values.otherCollege : values.college;
      }

      await addDoc(collection(firestore, 'visits'), {
        ...newVisitData,
        createdAt: serverTimestamp(),
      });

      setVisitData({
        fullName: values.fullName,
        date: newVisitData.date,
        time: newVisitData.time,
      });
      setShowSuccess(true);
      form.reset(); 
    } catch (error) {
      console.error('Error adding visit: ', error);
      toast({
        variant: 'destructive',
        title: 'Check-in failed',
        description: 'An error occurred. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const dataLoading = authLoading || undergradLoading || gradLoading || purposeLoading || (!!authUser && !authUser.isAnonymous && profileLoading);

  if (dataLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const collegeOptions = watchedEducationLevel === 'Undergraduate'
    ? undergraduateColleges
    : watchedEducationLevel === 'Graduate Studies'
    ? graduateStudies
    : [];
  
  return (
    <>
      <CheckInSuccessDialog 
        open={showSuccess} 
        onOpenChange={setShowSuccess} 
        visitData={visitData} 
        isGuest={authUser?.isAnonymous}
      />
      <div className="w-full max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-10">
          <BookOpen className="mx-auto h-12 w-12 text-primary animate-bounce" />
          <h1 className="text-4xl font-bold tracking-tight text-foreground mt-4">Welcome to the NEU Library</h1>
          {userProfile?.name ? (
             <p className="mt-3 text-lg text-muted-foreground">Hi {userProfile.name.split(' ')[0]}, ready for some productive study time?</p>
          ): (
             <p className="mt-3 text-lg text-muted-foreground">Log your visit to start your journey.</p>
          )}
        </div>

        <Card className="w-full max-w-lg mx-auto shadow-2xl rounded-2xl bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-2xl">Library Check-in</CardTitle>
            <CardDescription>Fill out the form below to log your visit.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Juan Dela Cruz" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="visitorType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>I am a</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          if (value !== 'Student') {
                            form.setValue('educationLevel', undefined);
                            form.setValue('college', undefined);
                            form.setValue('otherCollege', '');
                            form.setValue('studentNumber', '');
                            form.clearErrors(['educationLevel', 'college', 'studentNumber', 'otherCollege']);
                          }
                        }} 
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select your role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {visitorTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type === 'Employee' ? 'Employee (Teacher/Staff)' : type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {watchedVisitorType === 'Student' && (
                  <>
                    <FormField
                      control={form.control}
                      name="studentNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Student Number</FormLabel>
                          <FormControl>
                            <Input placeholder="2023-12345" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="educationLevel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Education Level</FormLabel>
                          <Select 
                            onValueChange={(value) => {
                              field.onChange(value);
                              form.setValue('college', undefined);
                              form.setValue('otherCollege', '');
                              form.clearErrors(['college', 'otherCollege']);
                            }} 
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select your education level" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {educationLevels.map((level) => (
                                <SelectItem key={level} value={level}>
                                  {level}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="college"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>College / Program</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} disabled={!watchedEducationLevel}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select your college/program" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {collegeOptions.map((c) => (
                                <SelectItem key={c} value={c}>
                                  {c === 'Other' ? 'Others (Please specify)' : c}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {watchedCollege === 'Other' && (
                      <FormField
                        control={form.control}
                        name="otherCollege"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Please Specify Your College/Program</FormLabel>
                            <FormControl>
                              <Input placeholder="Your college/program" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </>
                )}

                <FormField
                  control={form.control}
                  name="purposeOfVisit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Purpose of Visit</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select your purpose of visit" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                           {purposeOptions.map((p) => (
                            <SelectItem key={p} value={p}>
                              {p === 'Other' ? 'Other (Specify)' : p}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {watchedPurposeOfVisit === 'Other' && (
                  <FormField
                    control={form.control}
                    name="otherPurpose"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Please Specify Purpose</FormLabel>
                        <FormControl>
                          <Input placeholder="Your purpose of visit" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <Button type="submit" className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold text-lg py-6 transition-all duration-300 hover:scale-105 hover:shadow-xl active:scale-100 disabled:opacity-70 animate-pulse-slow" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : null}
                  Confirm Visit
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
