import { Users, ShieldCheck, ScrollText, Building2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const TILES = [
  {
    title: "Users",
    description: "Invite teammates, assign roles, manage access.",
    icon: Users,
    permission: "users.manage",
  },
  {
    title: "Roles & Permissions",
    description: "Define what each role in LED Zone can do.",
    icon: ShieldCheck,
    permission: "roles.manage",
  },
  {
    title: "Audit Log",
    description: "See every sensitive action taken across the system.",
    icon: ScrollText,
    permission: "audit.view",
  },
  {
    title: "Company",
    description: "LED Zone's profile, locations, and currency settings.",
    icon: Building2,
    permission: "company.manage",
  },
];

export function DashboardOverview({ permissionKeys }: { permissionKeys: string[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {TILES.filter((tile) => permissionKeys.includes(tile.permission)).map((tile) => (
        <Card key={tile.title}>
          <CardHeader>
            <tile.icon className="text-muted-foreground mb-2 size-5" />
            <CardTitle>{tile.title}</CardTitle>
            <CardDescription>{tile.description}</CardDescription>
          </CardHeader>
          <CardContent />
        </Card>
      ))}
      {permissionKeys.length === 0 && (
        <Card className="sm:col-span-2 lg:col-span-3">
          <CardHeader>
            <CardTitle>Welcome to LED Zone ERP</CardTitle>
            <CardDescription>
              You don&apos;t have any administrative modules enabled yet. Modules you have access
              to will appear here as your administrator grants permissions.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
