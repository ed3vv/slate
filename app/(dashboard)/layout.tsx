"use client";

import { useEffect } from "react";
import { useAuth } from "@/lib/hooks";
import { useUserProfile } from "@/lib/useUserProfile";
import { useTaskStats } from "@/lib/useTaskStats";
import { DashboardHeader } from "@/components/dashboard-header";
import { FocusTimer } from "@/components/ui/focus-timer";
import { DailyTodos } from "@/components/ui/daily-todos";
import { usePathname } from "next/navigation";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth(false);
  useUserProfile(user?.id, user?.email);
  const pathname = usePathname();
  const { stats, overdueCount } = useTaskStats(!authLoading && !!user, user?.id);

  // Save current route to localStorage whenever it changes
  useEffect(() => {
    if (pathname) {
      localStorage.setItem('lastVisitedRoute', pathname);
    }
  }, [pathname]);

  return (
    <div className="mb-60 min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-8xl mx-auto">
        <DashboardHeader
          stats={stats}
          overdueCount={overdueCount}
        />

        <div className="flex flex-col gap-6 custom:flex-row">
          <div className="w-full flex-shrink-0 custom:w-80">
            <FocusTimer />
            <DailyTodos />
          </div>

          <div className="flex-1 min-w-0">{children}</div>
        </div>
      </div>
    </div>
  );
}
