"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Home, Moon, Sun } from "lucide-react";
import { useRouter } from "next/navigation";
import { useDarkMode, useAuth } from "@/lib/hooks";
import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabaseClient";


export default function SettingsPage() {
  const router = useRouter();
  const [isDark, setIsDark] = useDarkMode();
  const [mounted, setMounted] = useState(false);
  const { user } = useAuth(false);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const fetchUsername = async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from("user_profiles")
        .select("username")
        .eq("user_id", user.id)
        .single();
      setUsername(data?.username || null);
    };
    fetchUsername();
  }, [user]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <>
        <main className="p-6">
        <h1 className="text-2xl font-semibold mb-6 text-foreground">Settings</h1>

        <div className="space-y-6">
          {/* User Profile */}
          {user && (
            <div className="p-4 bg-card rounded-lg border">
              <h2 className="text-lg font-medium text-foreground mb-3">Profile</h2>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Email: </span>
                  <span className="text-foreground">{user.email}</span>
                </div>
                {username && (
                  <div>
                    <span className="text-muted-foreground">Username: </span>
                    <span className="text-foreground">{username}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-nowrap gap-4">
            <div className="flex flex-1 items-center justify-between p-4 bg-card rounded-lg border">
              <div>
                <h2 className="text-lg font-medium text-foreground">Appearance</h2>
                <p className="text-sm text-muted-foreground">Toggle between light and dark mode</p>
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsDark(!isDark)}
                aria-label="Toggle dark mode"
                className="bg-card text-foreground hover:bg-secondary hover:text-foreground"
              >
                {mounted ? (
                  isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />
                ) : (
                  <div className="h-5 w-5" />
                )}
              </Button>
            </div>

            <div className="flex-1">

            </div>
          </div>

          

          <div className="flex items-center gap-2">
            <Button asChild>
              <Link href="/login">
                <Home className="h-5 w-5" aria-hidden="true" />
              </Link>
            </Button>
            <Button
              onClick={handleSignOut}
              variant="outline"
              className="h-9 bg-card hover:bg-secondary text-foreground"
            >
              Sign Out
            </Button>
          </div>
        </div>
        </main>

    </>

  );
}
