import { Link } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { usePublicProfile } from "@/hooks/useProfile";

interface Props {
  userId: number;
  size?: "small" | "medium" | "large";
}

const sizeMap = {
  small:  { avatar: "h-8 w-8",  text: "text-sm", sub: "text-xs" },
  medium: { avatar: "h-10 w-10", text: "text-sm", sub: "text-xs" },
  large:  { avatar: "h-14 w-14", text: "text-base font-semibold", sub: "text-sm" },
};

export default function ProfileCard({ userId, size = "medium" }: Props) {
  const { profile, isLoading } = usePublicProfile(userId);
  const s = sizeMap[size];

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 animate-pulse`}>
        <div className={`rounded-full bg-muted ${s.avatar}`} />
        <div className="h-4 w-24 bg-muted rounded" />
      </div>
    );
  }

  if (!profile) return null;

  const initials = profile.fullName.split(" ").map(n => n[0]).join("").slice(0, 2);

  return (
    <Link href={`/profile/${userId}`} className="flex items-center gap-2 group hover:opacity-80 transition-opacity">
      <Avatar className={s.avatar}>
        {profile.avatar && <AvatarImage src={profile.avatar} alt={profile.fullName} />}
        <AvatarFallback className="bg-primary/10 text-primary text-xs">{initials}</AvatarFallback>
      </Avatar>
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className={`${s.text} font-medium leading-none truncate group-hover:text-primary`}>
          {profile.fullName}
        </span>
        {profile.bio && size === "large" && (
          <span className={`${s.sub} text-muted-foreground truncate`}>{profile.bio}</span>
        )}
        {profile.department && (
          <span className={`${s.sub} text-muted-foreground truncate`}>{profile.department}</span>
        )}
      </div>
    </Link>
  );
}
