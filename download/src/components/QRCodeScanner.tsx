'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner, Html5QrcodeError, QrCodeSuccessCallback } from 'html5-qrcode';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { CameraOff } from 'lucide-react';

const QR_CODE_SCANNER_ELEMENT_ID = 'qr-code-scanner';

interface QRCodeScannerProps {
  onScanSuccess: () => void;
}

export function QRCodeScanner({ onScanSuccess }: QRCodeScannerProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const router = useRouter();
  const { toast } = useToast();
  const [hasCameraPermission, setHasCameraPermission] = useState(true);

  useEffect(() => {
    // Dynamically import to avoid SSR issues
    import('html5-qrcode').then(({ Html5QrcodeScanner }) => {
      // Prevents re-initialization on re-renders
      if (!scannerRef.current) {
        const scanner = new Html5QrcodeScanner(
          QR_CODE_SCANNER_ELEMENT_ID,
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            supportedScanTypes: [], // Use all supported scan types
          },
          false // verbose
        );

        const handleScanSuccess: QrCodeSuccessCallback = (decodedText, decodedResult) => {
          // Stop scanning
          scanner.clear().catch(error => {
            console.error('Failed to clear scanner', error);
          });
          scannerRef.current = null;

          // Validate the scanned URL
          try {
            const url = new URL(decodedText);
            if (url.pathname === '/check-in' && url.searchParams.get('method') === 'qr_code') {
              onScanSuccess();
              router.push(decodedText);
            } else {
              toast({
                variant: 'destructive',
                title: 'Invalid QR Code',
                description: 'This QR code is not valid for library check-in.',
              });
            }
          } catch (error) {
             toast({
                variant: 'destructive',
                title: 'Invalid QR Code',
                description: 'Scanned data is not a valid URL.',
              });
          }
        };

        const handleScanError = (error: Html5QrcodeError) => {
          // This is called frequently, so we only log specific, non-noisy errors.
           if (error.name === 'NotAllowedError') {
             setHasCameraPermission(false);
           }
        };
        
        scanner.render(handleScanSuccess, handleScanError);
        scannerRef.current = scanner;
      }
    }).catch(err => {
      console.error("Failed to load html5-qrcode", err);
    });

    // Cleanup function to clear the scanner on component unmount
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(error => {
          console.error('Failed to clear scanner on unmount', error);
        });
        scannerRef.current = null;
      }
    };
  }, [router, onScanSuccess, toast]);

  return (
    <div>
        <div id={QR_CODE_SCANNER_ELEMENT_ID} />
        {!hasCameraPermission && (
            <Alert variant="destructive" className="mt-4">
              <CameraOff className="h-4 w-4" />
              <AlertTitle>Camera Access Denied</AlertTitle>
              <AlertDescription>
                Please enable camera permissions in your browser settings to use the QR scanner.
              </AlertDescription>
            </Alert>
        )}
    </div>
  );
}
