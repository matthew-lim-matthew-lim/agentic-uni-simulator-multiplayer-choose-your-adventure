import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-20">
      <Card className="p-8 max-w-md text-center">
        <div className="font-display text-3xl mb-2">404</div>
        <div className="text-sm text-[var(--muted)] mb-5">
          This branch of the story doesn&apos;t exist (or you can&apos;t see it).
        </div>
        <div className="flex justify-center gap-2">
          <Link href="/">
            <Button variant="secondary">Home</Button>
          </Link>
          <Link href="/play">
            <Button>Play</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
