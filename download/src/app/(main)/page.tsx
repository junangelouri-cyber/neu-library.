'use client';

import { Loader2 } from 'lucide-react';

/**
 * This page is the entry point for the main application section.
 * The redirection logic is now handled in the main layout (`/app/(main)/layout.tsx`).
 * This component simply displays a loader, which will be visible for a brief
 * moment while the layout determines the correct destination.
 */
export default function InitialLoadingPage() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="ml-2 text-muted-foreground">Please wait...</p>
    </div>
  );
}
