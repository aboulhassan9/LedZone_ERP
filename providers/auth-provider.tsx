"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  status: string;
};

type AuthContextValue = {
  user: User | null;
  profile: Profile | null;
  permissionKeys: string[];
  hasPermission: (key: string) => boolean;
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({
  user,
  profile,
  permissionKeys,
  children,
}: {
  user: User | null;
  profile: Profile | null;
  permissionKeys: string[];
  children: React.ReactNode;
}) {
  const router = useRouter();

  React.useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      // Session refreshed/signed out elsewhere — resync server-rendered data.
      if (event === "SIGNED_OUT" || event === "TOKEN_REFRESHED") {
        router.refresh();
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const value = React.useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      permissionKeys,
      hasPermission: (key: string) => permissionKeys.includes(key),
    }),
    [user, profile, permissionKeys]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
