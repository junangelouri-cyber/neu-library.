'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, PlusCircle, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { collection, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import type { College } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

// Zod schema for validating the new college/program form.
const formSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),
});

type FormValues = z.infer<typeof formSchema>;

// A reusable component for the add form.
const AddForm = ({ level, isSubmitting, onSubmit }) => {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '' },
  });

  const handleSubmit = (values: FormValues) => {
    onSubmit(values, form.reset);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="flex gap-2">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem className="flex-grow">
              <FormControl>
                <Input placeholder={level === 'Undergraduate' ? "e.g., 'College of Arts and Sciences'" : "e.g., 'Master in Business Administration'"} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
          Add
        </Button>
      </form>
    </Form>
  );
};

// A reusable component for displaying the list of items.
const ItemList = ({ items, handleDelete, loading }) => {
  if (loading) {
    return <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />;
  }
  if (items.length === 0) {
    return (
      <Alert>
        <PlusCircle className="h-4 w-4" />
        <AlertTitle>No Items Found</AlertTitle>
        <AlertDescription>
          Use the form above to add the first item to this list.
        </AlertDescription>
      </Alert>
    );
  }
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <Badge key={item.id} variant="secondary" className="text-sm py-1 pl-3 pr-1 flex items-center gap-2">
          {item.name}
          <button onClick={() => handleDelete(item.id, item.name)} className="rounded-full hover:bg-muted-foreground/20 p-0.5" aria-label={`Remove ${item.name}`}>
             <Trash2 className="h-3 w-3 text-destructive" />
          </button>
        </Badge>
      ))}
    </div>
  );
};


export default function AdminCollegesAndProgramsPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Hooks for accessing Firestore and displaying toasts.
  const firestore = useFirestore();
  const { toast } = useToast();

  const collegesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'colleges') : null, [firestore]);
  const { data: allItems, isLoading } = useCollection<College>(collegesQuery);

  const { undergraduateColleges, graduatePrograms } = useMemo(() => {
    const undergraduateColleges = allItems?.filter(item => item.level === 'Undergraduate').sort((a, b) => a.name.localeCompare(b.name)) || [];
    const graduatePrograms = allItems?.filter(item => item.level === 'Graduate Studies').sort((a, b) => a.name.localeCompare(b.name)) || [];
    return { undergraduateColleges, graduatePrograms };
  }, [allItems]);

  // Function to handle adding a new college or program.
  const handleAddItem = async (values: FormValues, resetForm: () => void, level: College['level']) => {
    setIsSubmitting(true);
    try {
      await addDoc(collection(firestore, 'colleges'), { 
        name: values.name,
        level: level,
        createdAt: serverTimestamp()
      });
      toast({ title: 'Success', description: `"${values.name}" added successfully.` });
      resetForm();
    } catch (error) {
      console.error("Error adding item:", error);
      toast({ variant: 'destructive', title: 'Error', description: `Failed to add "${values.name}".` });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to handle deleting an item.
  const handleDeleteItem = async (itemId: string, itemName: string) => {
     try {
      await deleteDoc(doc(firestore, 'colleges', itemId));
      toast({ title: 'Success', description: `"${itemName}" removed successfully.` });
    } catch (error) {
      console.error("Error deleting item:", error);
      toast({ variant: 'destructive', title: 'Error', description: `Failed to remove "${itemName}".` });
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Manage Colleges & Programs</h1>
      
      <Tabs defaultValue="undergraduate" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="undergraduate">Undergraduate Colleges</TabsTrigger>
          <TabsTrigger value="graduate">Graduate Programs</TabsTrigger>
        </TabsList>
        
        {/* Undergraduate Colleges Tab */}
        <TabsContent value="undergraduate">
          <Card className="rounded-2xl shadow-md">
            <CardHeader>
              <CardTitle>Undergraduate Colleges</CardTitle>
              <CardDescription>Add or remove undergraduate colleges from the list available to users.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <AddForm level="Undergraduate" isSubmitting={isSubmitting} onSubmit={(values, reset) => handleAddItem(values, reset, 'Undergraduate')} />
              <ItemList items={undergraduateColleges} handleDelete={handleDeleteItem} loading={isLoading} />
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Graduate Programs Tab */}
        <TabsContent value="graduate">
          <Card className="rounded-2xl shadow-md">
            <CardHeader>
              <CardTitle>Graduate Programs</CardTitle>
              <CardDescription>Add or remove graduate programs from the list available to users.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <AddForm level="Graduate" isSubmitting={isSubmitting} onSubmit={(values, reset) => handleAddItem(values, reset, 'Graduate Studies')} />
              <ItemList items={graduatePrograms} handleDelete={handleDeleteItem} loading={isLoading} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
