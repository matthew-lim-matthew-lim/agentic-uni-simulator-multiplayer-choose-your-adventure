import { Card } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-20">
      <Card className="p-6 inline-flex items-center gap-3 text-[var(--muted)] text-sm">
        <span className="size-2 rounded-full bg-[var(--accent)] animate-pulse" />
        Loading…
      </Card>
    </div>
  );
}
