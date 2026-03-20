'use client';

import { useState, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, updateDoc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

// UI Components
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';

export default function AdminUsersPage() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  
  // Fetch all users in real-time
  const usersQuery = useMemoFirebase(() => 
    firestore ? collection(firestore, 'users') : null
  , [firestore]);
  const { data: users, isLoading: usersLoading } = useCollection<UserProfile>(usersQuery);

  // Memoize the filtering logic
  const filteredUsers = useMemo(() => {
    if (!users) return [];
    if (!searchTerm) return users;

    return users.filter(user =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  // Handle toggling the 'isBlocked' status of a user
  const handleBlockToggle = async (user: UserProfile) => {
    if (!firestore) return;

    const userRef = doc(firestore, 'users', user.id);
    const newBlockedStatus = !user.isBlocked;

    try {
      // Update the 'isBlocked' field in the user's document
      await updateDoc(userRef, { isBlocked: newBlockedStatus });
      toast({
        variant: 'success',
        title: `User ${newBlockedStatus ? 'Blocked' : 'Unblocked'}`,
        description: `${user.name} has been successfully ${newBlockedStatus ? 'blocked' : 'unblocked'}.`,
      });
    } catch (error) {
      console.error("Error updating user status:", error);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: 'Could not update the user status. Please try again.',
      });
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">User Management</h1>
      <Card className="rounded-2xl shadow-md">
        <CardHeader>
          <CardTitle>Registered Users</CardTitle>
          <CardDescription>View, search, and manage user accounts.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
          
          <div className="rounded-md border">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Block User</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id} className="even:bg-muted/50">
                      <TableCell>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.isBlocked ? 'destructive' : 'outline'}>
                          {user.isBlocked ? 'Blocked' : 'Active'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {/* The switch to block or unblock a user. It's disabled for admins to prevent self-locking. */}
                        <Switch
                          checked={user.isBlocked}
                          onCheckedChange={() => handleBlockToggle(user)}
                          disabled={user.role === 'admin'}
                          aria-label={`Block user ${user.name}`}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      No users found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
