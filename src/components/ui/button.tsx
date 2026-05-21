import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-[var(--accent)] text-[var(--accent-ink)] hover:bg-[var(--accent-strong)] active:scale-[0.98] glow-yellow",
        secondary:
          "bg-[var(--surface-2)] text-[var(--foreground)] border border-[var(--border)] hover:border-[var(--accent)]/40 hover:bg-[var(--surface)]",
        ghost:
          "bg-transparent text-[var(--foreground)] hover:bg-[var(--surface)]",
        outline:
          "bg-transparent text-[var(--foreground)] border border-[var(--border)] hover:border-[var(--accent)]/60",
        danger:
          "bg-[var(--danger)]/10 text-[var(--danger)] border border-[var(--danger)]/40 hover:bg-[var(--danger)]/20",
      },
      size: {
        sm: "h-9 px-4 text-sm",
        md: "h-11 px-6 text-sm",
        lg: "h-12 px-8 text-base",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
);
Button.displayName = "Button";

export { buttonVariants };
