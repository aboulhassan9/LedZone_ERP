import { getCurrentUser, getCurrentProfile } from "@/lib/auth/permissions";
import { ProfileForm } from "@/modules/settings/components/profile-form";

export default async function ProfileSettingsPage() {
  const [user, profile] = await Promise.all([getCurrentUser(), getCurrentProfile()]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="text-muted-foreground text-sm">Manage your personal information.</p>
      </div>
      <ProfileForm
        fullName={profile?.full_name ?? ""}
        phone={profile?.phone ?? null}
        email={user?.email ?? null}
      />
    </div>
  );
}
