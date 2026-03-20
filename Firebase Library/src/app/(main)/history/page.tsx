'use client';

import { useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Visit } from '@/lib/types';
import { Loader2, History, BookOpen, Clock, Building } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

export default function HistoryPage() {
  const { user: authUser, isUserLoading: authLoading } = useUser();
  const firestore = useFirestore();

  const userVisitsQuery = useMemoFirebase(() => {
    if (!firestore || !authUser || authUser.isAnonymous) return null;
    return query(
      collection(firestore, 'visits'), 
      where('userId', '==', authUser.uid)
    );
  }, [firestore, authUser]);

  const { data: visits, isLoading: visitsLoading } = useCollection<Visit>(userVisitsQuery);

  const sortedVisits = useMemo(() => {
    if (!visits) return [];
    return [...visits].sort((a, b) => {
      const timeA = a.createdAt?.toMillis() || 0;
      const timeB = b.createdAt?.toMillis() || 0;
      return timeB - timeA;
    });
  }, [visits]);

  const isLoading = authLoading || visitsLoading;

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <header>
        <h1 className="text-4xl font-bold tracking-tight">My Visit History</h1>
        <p className="text-lg text-muted-foreground mt-2">
          A timeline of all your check-ins to the NEU Library.
        </p>
      </header>

      {sortedVisits.length > 0 ? (
        <div className="relative pl-8 border-l-2 border-primary/20 space-y-10">
          {sortedVisits.map((visit) => (
            <div key={visit.id} className="relative">
              <div className="absolute -left-[3.2rem] top-1 h-8 w-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground">
                <Clock className="h-5 w-5" />
              </div>
              <Card className="ml-4 hover:shadow-lg transition-shadow duration-300">
                <CardContent className="p-6 grid gap-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold text-primary">{visit.purposeOfVisitName}</h3>
                      <p className="text-sm font-bold text-foreground">{visit.date}</p>
                      <p className="text-xs text-muted-foreground">{visit.time}</p>
                    </div>
                    <Badge variant="secondary" className="whitespace-nowrap">{visit.collegeName}</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      ) : (
        <Alert className="border-2 border-dashed rounded-xl p-8 text-center bg-muted/50">
          <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <AlertTitle className="text-xl font-bold">Your library journey starts here!</AlertTitle>
          <AlertDescription className="mt-2 text-base">
            Your first visit will appear on this timeline once you check in.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
