'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Building, Palette, Bell, ChevronRight } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ChangePasswordDialog } from '@/components/auth/ChangePasswordDialog';


/**
 * AdminSettingsPage provides a centralized hub for application configuration.
 * It offers navigation to user and content management sections, as well as
 * placeholders for future settings like appearance and notifications.
 */
export default function AdminSettingsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const auth = useAuth();
  const isSocialLogin = auth.currentUser?.providerData.some(p => p.providerId !== 'password');

  return (
    <>
      <div className="space-y-6">
        <header className="text-center">
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">
            Configure application settings and manage system content.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Management Card */}
          <Card className="lg:col-span-1 rounded-xl shadow-md">
            <CardHeader>
              <CardTitle>Management</CardTitle>
              <CardDescription>
                Manage users, colleges, and other system entities.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Link href="/admin/users">
                <Button variant="outline" className="w-full justify-between">
                  <span>User Management</span>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </Button>
              </Link>
              <Link href="/admin/colleges">
                <Button variant="outline" className="w-full justify-between">
                  <span>Colleges & Programs</span>
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Account Security Card */}
          <Card className="lg:col-span-1 rounded-xl shadow-md">
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

          {/* Appearance Card */}
          <Card className="lg:col-span-1 rounded-xl shadow-md">
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>
                Customize the look and feel of the application.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="dark-mode-switch" className="text-base">Dark Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Toggle the dark color scheme.
                  </p>
                </div>
                <Switch id="dark-mode-switch" disabled />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="theme-color" className="text-base">Theme Color</Label>
                  <p className="text-sm text-muted-foreground">
                    Primary color for UI elements.
                  </p>
                </div>
                <div className="h-8 w-8 rounded-full bg-primary border-2 border-muted" />
              </div>
            </CardContent>
          </Card>

          {/* Notifications Card */}
          <Card className="lg:col-span-1 rounded-xl shadow-md">
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>
                Manage how you receive notifications from the system.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="new-visitor-notif" className="text-base">New Visitor Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Real-time toast on new check-in.
                  </p>
                </div>
                <Switch id="new-visitor-notif" defaultChecked disabled />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="daily-summary-notif" className="text-base">Daily Summary</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive a daily email summary.
                  </p>
                </div>
                <Switch id="daily-summary-notif" disabled />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      {!isSocialLogin && (
          <ChangePasswordDialog isOpen={isDialogOpen} onOpenChange={setIsDialogOpen} />
      )}
    </>
  );
}
