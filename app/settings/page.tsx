"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Moon, Sun } from "lucide-react";
import { useRouter } from "next/navigation";
import { useDarkMode } from "@/lib/hooks";
import { useAuthWithProfile } from "@/lib/useAuthWithProfile";
import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TIMEZONES, getBrowserTimezone } from "@/lib/timezones";

import { supabase } from "@/lib/supabaseClient";


export default function SettingsPage() {
  const router = useRouter();
  const [isDark, setIsDark] = useDarkMode();
  const [mounted, setMounted] = useState(false);
  const { data: userProfile, refetch } = useAuthWithProfile(true);
  const [timezone, setTimezone] = useState<string>('UTC');

  useEffect(() => {
    setMounted(true);
    // Set initial timezone from profile or browser
    if (userProfile?.timezone) {
      setTimezone(userProfile.timezone);
    } else {
      const browserTz = getBrowserTimezone();
      setTimezone(browserTz);
    }
  }, [userProfile]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleTimezoneChange = async (newTimezone: string) => {
    setTimezone(newTimezone);
    if (userProfile?.user.id) {
      try {
        await supabase
          .from('user_profiles')
          .update({ timezone: newTimezone })
          .eq('user_id', userProfile.user.id);
        refetch();
      } catch (error) {
        console.error('Failed to update timezone:', error);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <main className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-foreground">Settings</h1>

        <div className="space-y-6">
          {/* User Profile - Always render to prevent layout shift */}
          <div className="p-4 bg-card rounded-lg border">
            <h2 className="text-lg font-medium text-foreground mb-3">Profile</h2>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Email: </span>
                {userProfile?.user.email ? (
                  <span className="text-foreground">{userProfile.user.email}</span>
                ) : (
                  <span className="inline-block h-4 w-48 bg-muted animate-pulse rounded"></span>
                )}
              </div>
              <div>
                <span className="text-muted-foreground">Username: </span>
                {userProfile?.username ? (
                  <span className="text-foreground">{userProfile.username}</span>
                ) : (
                  <span className="inline-block h-4 w-32 bg-muted animate-pulse rounded"></span>
                )}
              </div>
            </div>
          </div>

          {/* Timezone */}
          <div className="p-4 bg-card rounded-lg border">
            <h2 className="text-lg font-medium text-foreground mb-3">Timezone</h2>
            <p className="text-sm text-muted-foreground mb-3">Select your timezone for accurate time displays</p>
            <Select value={timezone} onValueChange={handleTimezoneChange}>
              <SelectTrigger className="w-full bg-background">
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Appearance */}
          <div className="flex items-center justify-between p-4 bg-card rounded-lg border">
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



          <div className="flex items-center gap-2">
            <Button asChild variant="outline" className="bg-card hover:bg-secondary text-foreground">
              <Link href="/subjects">
                <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
                Back to Dashboard
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
    </div>
  );
}
