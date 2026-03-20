'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useUser } from '@/firebase';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function MyQRCodePage() {
  const { user, isUserLoading } = useUser();
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  useEffect(() => {
    if (user) {
      // Use the user's unique ID as the data for the QR code.
      const dataToEncode = user.uid; 
      const apiUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(dataToEncode)}&size=300x300&ecc=H`;
      setQrCodeUrl(apiUrl);
    }
  }, [user]);

  if (isUserLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    // This case should be handled by the main layout, which redirects non-users.
    return (
        <div className="flex h-full w-full items-center justify-center">
            <p>Please log in to view your QR code.</p>
        </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold">My QR Code</h1>
        <p className="text-muted-foreground">
          Present this QR code for quick identification or library check-ins.
        </p>
      </header>

      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Your Personal QR Code</CardTitle>
          <CardDescription>
            This code is unique to your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6">
          {qrCodeUrl ? (
            <div className="p-4 bg-white rounded-md border">
                 <Image
                    src={qrCodeUrl}
                    alt="Your personal QR Code"
                    width={300}
                    height={300}
                    priority
                />
            </div>
          ) : (
            <div className="w-[300px] h-[300px] flex items-center justify-center bg-muted rounded-md">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          <div className="text-center">
              <p className="font-medium">{user.email}</p>
              <p className="text-sm text-muted-foreground">UID: {user.uid}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
