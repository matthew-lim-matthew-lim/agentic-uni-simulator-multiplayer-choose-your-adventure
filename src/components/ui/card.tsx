import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-2xl border border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur-sm shadow-[0_10px_40px_-20px_rgba(0,0,0,0.6)]",
        className
      )}
      {...props}
    />
  )
);
Card.displayName = "Card";
