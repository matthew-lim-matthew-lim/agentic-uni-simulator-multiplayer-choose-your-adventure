"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-20">
      <Card className="p-8 max-w-md text-center">
        <div className="font-display text-2xl mb-2">Something broke</div>
        <div className="text-sm text-[var(--muted)] mb-5">{error.message}</div>
        <div className="flex justify-center gap-2">
          <Button onClick={reset}>Try again</Button>
          <Link href="/">
            <Button variant="secondary">Home</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
