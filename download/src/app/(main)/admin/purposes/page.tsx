'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { adminPurposeSuggestion } from '@/ai/flows/admin-purpose-suggestion-flow';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Loader2, Wand, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { collection, addDoc, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import type { Purpose } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

const formSchema = z.object({
  partialPurpose: z.string().min(3, 'Enter at least 3 characters.'),
});

export default function AdminPurposesPage() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      partialPurpose: '',
    },
  });
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [purposes, setPurposes] = useState<Purpose[]>([]);
  const [loadingPurposes, setLoadingPurposes] = useState(true);
  const { toast } = useToast();
  const firestore = useFirestore();

  useEffect(() => {
    setLoadingPurposes(true);
    const unsubscribe = onSnapshot(collection(firestore, 'purposeOfVisits'), (querySnapshot) => {
      const purposeList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Purpose[];
      setPurposes(purposeList);
      setLoadingPurposes(false);
    }, (error) => {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch purposes.' });
      setLoadingPurposes(false);
    });

    return () => unsubscribe();
  }, [firestore, toast]);

  async function onSuggest(values: z.infer<typeof formSchema>) {
    setIsSuggesting(true);
    setSuggestions([]);
    try {
      const result = await adminPurposeSuggestion({ partialPurpose: values.partialPurpose });
      setSuggestions(result.suggestions);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Suggestion Error', description: 'Could not get AI suggestions.' });
    } finally {
      setIsSuggesting(false);
    }
  }

  const handleAddPurpose = async (purposeName: string) => {
    try {
      await addDoc(collection(firestore, 'purposeOfVisits'), { name: purposeName });
      toast({ title: 'Success', description: `Purpose "${purposeName}" added.` });
      setSuggestions(prev => prev.filter(s => s !== purposeName));
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to add purpose.' });
    }
  };

  const handleDeletePurpose = async (purposeId: string) => {
     try {
      await deleteDoc(doc(firestore, 'purposeOfVisits', purposeId));
      toast({ title: 'Success', description: `Purpose removed.` });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to remove purpose.' });
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Manage Visit Purposes</h1>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-2xl shadow-md">
          <CardHeader>
            <CardTitle>AI Purpose Suggestion</CardTitle>
            <CardDescription>Generate standardized visit purposes using AI.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSuggest)} className="flex gap-2">
                <FormField
                  control={form.control}
                  name="partialPurpose"
                  render={({ field }) => (
                    <FormItem className="flex-grow">
                      <FormControl>
                        <Input placeholder="e.g., 'Research for...'" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={isSuggesting}>
                  {isSuggesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand className="mr-2 h-4 w-4" />}
                  Suggest
                </Button>
              </form>
            </Form>
            {suggestions.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold">Suggestions:</h3>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((s, i) => (
                    <Button key={i} variant="outline" size="sm" onClick={() => handleAddPurpose(s)}>
                      {s}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-md">
          <CardHeader>
            <CardTitle>Current Purposes</CardTitle>
            <CardDescription>The list of purposes visitors can select from.</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingPurposes ? (
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            ) : purposes.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {purposes.map((p) => (
                  <Badge key={p.id} variant="secondary" className="text-sm py-1 pl-3 pr-1 flex items-center gap-2">
                    {p.name}
                    <button onClick={() => handleDeletePurpose(p.id)} className="rounded-full hover:bg-muted-foreground/20 p-0.5">
                       <Trash2 className="h-3 w-3 text-destructive" />
                    </button>
                  </Badge>
                ))}
              </div>
            ) : (
                <Alert>
                  <Wand className="h-4 w-4" />
                  <AlertTitle>No Purposes Found</AlertTitle>
                  <AlertDescription>
                    Use the AI suggestion tool to add some visit purposes.
                  </AlertDescription>
                </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
