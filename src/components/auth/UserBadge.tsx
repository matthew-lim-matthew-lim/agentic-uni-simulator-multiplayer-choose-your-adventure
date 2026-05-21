import type { Profile } from "@/lib/supabase/types";

export function UserBadge({ profile }: { profile: Profile }) {
  const initial = (profile.display_name || "?").slice(0, 1).toUpperCase();
  return (
    <div className="flex items-center gap-2 text-sm">
      <div
        className="size-7 rounded-full grid place-items-center font-medium text-xs"
        style={{
          background: `hsla(${profile.hue}, 90%, 60%, 0.2)`,
          color: `hsl(${profile.hue}, 90%, 70%)`,
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: `hsla(${profile.hue}, 90%, 60%, 0.5)`,
        }}
      >
        {profile.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatar_url}
            alt={profile.display_name}
            className="size-7 rounded-full object-cover"
          />
        ) : (
          initial
        )}
      </div>
      <span className="font-medium">{profile.display_name}</span>
    </div>
  );
}
