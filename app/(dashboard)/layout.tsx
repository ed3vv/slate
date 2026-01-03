"use client";

import { useDarkMode, useAuth } from "@/lib/hooks";
import { useFocusSessions } from "@/lib/useFocusSessions";
import { DateUtils } from "@/lib/dateUtils";
import { DashboardHeader } from "@/components/dashboard-header";
import { FocusTimer } from "@/components/ui/focus-timer";
import { DailyTodos } from "@/components/ui/daily-todos";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useDarkMode();
  const { user, loading: authLoading } = useAuth(false);
  const { addSession } = useFocusSessions(!authLoading && !!user, user?.id);

  const handleSessionComplete = (duration: number) => {
    if (duration > 0) {
      addSession(DateUtils.today(), duration);
    }
  };

  return (
    <div className="mb-60 min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-8xl mx-auto">
        <DashboardHeader
          isDark={isDark}
          toggleDark={() => setIsDark(!isDark)}
          stats={{ completed: 0, total: 0, pending: 0 }}
          overdueCount={0}
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
