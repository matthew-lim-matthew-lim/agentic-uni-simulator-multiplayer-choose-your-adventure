import { signOut } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";

export function SignOutButton({
  size = "sm",
}: {
  size?: "sm" | "md";
}) {
  return (
    <form action={signOut}>
      <Button type="submit" variant="ghost" size={size}>
        Sign out
      </Button>
    </form>
  );
}
