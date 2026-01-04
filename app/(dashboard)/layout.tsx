"use client";

import { useEffect } from "react";
import { useAuth } from "@/lib/hooks";
import { useFocusSessions } from "@/lib/useFocusSessions";
import { useUserProfile } from "@/lib/useUserProfile";
import { DateUtils } from "@/lib/dateUtils";
import { useTaskStats } from "@/lib/useTaskStats";
import { DashboardHeader } from "@/components/dashboard-header";
import { FocusTimer } from "@/components/ui/focus-timer";
import { DailyTodos } from "@/components/ui/daily-todos";
import { supabase } from "@/lib/supabaseClient";
import { usePathname } from "next/navigation";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth(false);
  const { addSession } = useFocusSessions(!authLoading && !!user, user?.id);
  useUserProfile(user?.id, user?.email);
  const pathname = usePathname();
  const { stats, overdueCount } = useTaskStats(!authLoading && !!user, user?.id);

  // Save current route to localStorage whenever it changes
  useEffect(() => {
    if (pathname) {
      localStorage.setItem('lastVisitedRoute', pathname);
    }
  }, [pathname]);

  // Handle auto sign-out when "remember me" was unchecked
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (sessionStorage.getItem('autoSignOut') === 'true') {
        supabase.auth.signOut();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const handleSessionComplete = (duration: number) => {
    if (duration > 0) {
      addSession(DateUtils.today(), duration);
    }
  };

  return (
    <div className="mb-60 min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-8xl mx-auto">
        <DashboardHeader
          stats={stats}
          overdueCount={overdueCount}
        />

        <div className="flex flex-col gap-6 custom:flex-row">
          <div className="w-full flex-shrink-0 custom:w-80">
            <FocusTimer onSessionComplete={handleSessionComplete} />
            <DailyTodos />
          </div>

          <div className="flex-1 min-w-0">{children}</div>
        </div>
      </div>
    </div>
  );
}
