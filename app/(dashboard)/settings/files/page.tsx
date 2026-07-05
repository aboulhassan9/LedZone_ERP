import { getCurrentUser } from "@/lib/auth/permissions";
import { FileManager } from "@/modules/settings/components/file-manager";

export default async function FilesSettingsPage() {
  const user = await getCurrentUser();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Files</h1>
        <p className="text-muted-foreground text-sm">Your personal documents, stored privately.</p>
      </div>
      {user && <FileManager userId={user.id} />}
    </div>
  );
}
