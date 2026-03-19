'use client';

import { useState } from 'react';
import { useAuth } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChangePasswordDialog } from '@/components/auth/ChangePasswordDialog';

export default function SettingsPage() {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const auth = useAuth();
    const isSocialLogin = auth.currentUser?.providerData.some(p => p.providerId !== 'password');
    
    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <header>
                <h1 className="text-3xl font-bold">Account Settings</h1>
                <p className="text-muted-foreground">
                    Manage your account settings and preferences.
                </p>
            </header>
            
            <div className="max-w-lg">
                <Card className="rounded-xl shadow-md">
                    <CardHeader>
                        <CardTitle>Account Security</CardTitle>
                        <CardDescription>
                            Update your password to keep your account secure.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isSocialLogin ? (
                            <p className="text-sm text-muted-foreground">
                                You are logged in with a social provider (like Google). You can change your password through your provider's settings.
                            </p>
                        ) : (
                            <Button onClick={() => setIsDialogOpen(true)}>
                                Change Password
                            </Button>
                        )}
                    </CardContent>
                </Card>
            </div>

            {!isSocialLogin && (
                <ChangePasswordDialog isOpen={isDialogOpen} onOpenChange={setIsDialogOpen} />
            )}
        </div>
    );
}
