'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function QRCodeGeneratorPage() {
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [appUrl, setAppUrl] = useState('');
  const [loading, setLoading] = useState(true);

  // This effect runs on the client after the component mounts
  useEffect(() => {
    // We can safely access window.location.origin here
    const url = window.location.origin + '/check-in?method=qr_code';
    setAppUrl(url);

    // Use an external QR code generator API
    const apiUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(url)}&size=300x300&ecc=H`;
    setQrCodeUrl(apiUrl);
    setLoading(false);
  }, []);

  return (
    <div className="space-y-6">
      <header className="text-center">
        <h1 className="text-3xl font-bold">QR Code Generator</h1>
        <p className="text-muted-foreground">
          Generate and download the QR code for library check-in.
        </p>
      </header>

      <Card className="max-w-md mx-auto rounded-2xl shadow-md">
        <CardHeader>
          <CardTitle>Library Entrance QR Code</CardTitle>
          <CardDescription>
            Download this QR code and post it at the library entrance for visitors to scan.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6">
          {loading ? (
            <div className="w-[300px] h-[300px] flex items-center justify-center bg-muted rounded-md">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          ) : (
            <div className="p-4 bg-white rounded-md border">
                 <Image
                    src={qrCodeUrl}
                    alt="Library Check-in QR Code"
                    width={300}
                    height={300}
                    priority
                />
            </div>
          )}
          
          <div className="w-full space-y-2">
            <Label htmlFor="checkin-url">Check-in URL</Label>
            <Input id="checkin-url" value={appUrl} readOnly />
          </div>

          <Button asChild className="w-full" disabled={loading}>
            <a href={qrCodeUrl} download="neu-library-check-in-qr.png">
              <Download className="mr-2 h-4 w-4" />
              Download QR Code
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
