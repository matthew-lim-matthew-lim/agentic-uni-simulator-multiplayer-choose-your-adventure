import { signInWithGoogle } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";

export function SignInButton({
  redirectTo,
  variant = "primary",
  size = "md",
  children,
}: {
  redirectTo?: string;
  variant?: "primary" | "secondary" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  children?: React.ReactNode;
}) {
  return (
    <form
      action={async () => {
        "use server";
        await signInWithGoogle(redirectTo);
      }}
    >
      <Button type="submit" variant={variant} size={size}>
        <GoogleMark />
        {children ?? "Sign in with Google"}
      </Button>
    </form>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 18 18" width="14" height="14" aria-hidden>
      <path
        fill="#EA4335"
        d="M9 3.48c1.69 0 2.83.73 3.48 1.34l2.54-2.48C13.46.89 11.43 0 9 0 5.48 0 2.44 2.02.96 4.96l2.95 2.29C4.6 5.1 6.62 3.48 9 3.48z"
      />
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.74-.06-1.28-.19-1.84H9v3.34h4.96c-.1.83-.64 2.08-1.85 2.92l2.85 2.21c1.71-1.58 2.68-3.91 2.68-6.63z"
      />
      <path
        fill="#FBBC05"
        d="M3.91 10.71A5.41 5.41 0 0 1 3.62 9c0-.6.1-1.17.28-1.71L.96 4.96A9.01 9.01 0 0 0 0 9c0 1.45.34 2.82.96 4.04l2.95-2.33z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.85-2.21c-.77.52-1.81.88-3.11.88-2.38 0-4.4-1.62-5.09-3.78l-2.95 2.33C2.44 15.98 5.48 18 9 18z"
      />
    </svg>
  );
}
