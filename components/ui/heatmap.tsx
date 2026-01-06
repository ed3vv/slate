'use client';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { FocusSession } from '@/types';

interface HeatmapProps {
  focusSessions: FocusSession[];
}

export function StudyHeatmap({ focusSessions }: HeatmapProps) {
  // Calculate available years based on sessions, including "Last Year" option
  const availableYears = useMemo(() => {
    const years: (number | 'last-year')[] = ['last-year']; // Start with "Last Year"

    if (focusSessions.length > 0) {
      const yearSet = new Set<number>();
      focusSessions.forEach(session => {
        const year = new Date(session.timestamp || session.date).getFullYear();
        yearSet.add(year);
      });

      years.push(...Array.from(yearSet).sort((a, b) => b - a));
    }

    // Always include current year
    const currentYear = new Date().getFullYear();
    if (!years.includes(currentYear)) {
      years.push(currentYear);
    }

    return years;
  }, [focusSessions]);

  const [selectedYear, setSelectedYear] = useState<number | 'last-year'>('last-year');

  const heatmapData = useMemo(() => {
    const today = new Date();
    let actualStartDate: Date;
    let actualEndDate: Date;

    if (selectedYear === 'last-year') {
      // Last 365 days ending today (no future dates)
      actualEndDate = new Date(today);
      actualStartDate = new Date(today);
      actualStartDate.setDate(actualStartDate.getDate() - 364); // 365 days total including today
    } else {
      // Specific year view - always show full year structure
      actualStartDate = new Date(selectedYear, 0, 2); // Jan 2 of selected year
      actualEndDate = new Date(selectedYear + 1, 0, 1); // Jan 1 of next year
    }

    const totalDays = Math.ceil((actualEndDate.getTime() - actualStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Create a map of date -> total minutes
    const dateMap = new Map<string, number>();
    focusSessions.forEach(session => {
      const minutes = dateMap.get(session.date) || 0;
      dateMap.set(session.date, minutes + (session.duration / 60));
    });

    // Find max minutes for scaling
    const maxMinutes = Math.max(...Array.from(dateMap.values()), 1);

    // Generate grid data - only include days in the actual range
    const grid: Array<{ date: string; minutes: number; intensity: number }> = [];
    for (let i = 0; i < totalDays; i++) {
      const date = new Date(actualStartDate);
      date.setDate(actualStartDate.getDate() + i);
      const dateStr = date.toLocaleDateString('en-CA');
      const minutes = dateMap.get(dateStr) || 0;
      const intensity = minutes > 0 ? Math.ceil((minutes / maxMinutes) * 4) : 0;

      grid.push({ date: dateStr, minutes, intensity });
    }

    return { grid, maxMinutes };
  }, [focusSessions, selectedYear]);

  const getColor = (intensity: number): string => {
    const colors = {
      0: 'bg-secondary',
      1: 'bg-primary/20',
      2: 'bg-primary/40',
      3: 'bg-primary/60',
      4: 'bg-primary/80',
    };
    return colors[intensity as keyof typeof colors] || colors[0];
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  // Organize grid into columns where each column is a week (Sunday at top)
  const weeks: Array<Array<{ date: string; minutes: number; intensity: number; dayOfWeek: number }>> = [];

  if (heatmapData.grid.length > 0) {
    // Start from the first actual date (not the Sunday before it)
    const firstDate = new Date(heatmapData.grid[0].date);
    const lastDate = new Date(heatmapData.grid[heatmapData.grid.length - 1].date);

    // Find the Sunday on or after the first date for week 0 reference
    const firstDayOfWeek = firstDate.getDay();
    const firstSunday = new Date(firstDate);
    // If first date is not Sunday, find the next Sunday; otherwise use first date
    if (firstDayOfWeek !== 0) {
      firstSunday.setDate(firstDate.getDate() + (7 - firstDayOfWeek));
    }

    // Calculate total number of weeks needed
    const lastDayOfWeek = lastDate.getDay();
    const lastSunday = new Date(lastDate);
    lastSunday.setDate(lastDate.getDate() - lastDayOfWeek);

    // Calculate weeks from first date to last Sunday
    const daysFromStart = Math.ceil((lastSunday.getTime() - firstDate.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
    const totalWeeks = Math.max(daysFromStart, 1);

    // Initialize all week arrays
    for (let i = 0; i < totalWeeks; i++) {
      weeks[i] = [];
    }

    // Fill in the data for each day
    heatmapData.grid.forEach((day) => {
      const date = new Date(day.date);
      const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.

      // Calculate which week this day belongs to based on days since firstDate
      const daysSinceStart = Math.floor((date.getTime() - firstDate.getTime()) / (24 * 60 * 60 * 1000));
      const weekIndex = Math.floor((daysSinceStart + firstDayOfWeek) / 7);

      if (!weeks[weekIndex]) {
        weeks[weekIndex] = [];
      }

      weeks[weekIndex].push({ ...day, dayOfWeek });
    });

    // Sort days within each week by day of week (Sunday = 0 first)
    weeks.forEach(week => {
      week.sort((a, b) => a.dayOfWeek - b.dayOfWeek);
    });
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex items-start gap-4">
        {/* Year selection buttons - vertically stacked on the left */}
        <div className="flex flex-col gap-2 pt-1">
          {availableYears.map(year => (
            <Button
              key={year}
              onClick={() => setSelectedYear(year)}
              variant={selectedYear === year ? 'default' : 'outline'}
              size="sm"
              className={selectedYear === year ? 'bg-primary hover:bg-primary/90 text-primary-foreground' : 'bg-secondary hover:bg-secondary/80'}
            >
              {year === 'last-year' ? 'Last Year' : year}
            </Button>
          ))}
        </div>

        <div className="flex flex-col items-center flex-1">
          {/* Heatmap grid */}
          <div className="flex gap-1 pt-8 pr-12">
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="flex flex-col gap-1">
                {/* Render all 7 days of the week, but only show squares for days that exist */}
                {[0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => {
                  const day = week.find(d => d.dayOfWeek === dayOfWeek);

                  if (!day) {
                    // Empty slot for days not in this week
                    return <div key={dayOfWeek} className="w-3 h-3" />;
                  }

                  const date = new Date(day.date);
                  const tooltip = `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}: ${day.minutes > 0 ? formatDuration(day.minutes) : 'No activity'}`;

                  return (
                    <div
                      key={dayOfWeek}
                      className={`w-3 h-3 rounded-sm ${getColor(day.intensity)} transition-colors hover:ring-2 hover:ring-primary cursor-pointer relative group/day`}
                    >
                      {/* Custom tooltip with faster delay */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-lg whitespace-nowrap opacity-0 pointer-events-none group-hover/day:opacity-100 transition-opacity duration-200 delay-200 z-50">
                        {tooltip}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
            <span>Less</span>
            <div className="flex gap-1">
              {[0, 1, 2, 3, 4].map(level => (
                <div
                  key={level}
                  className={`w-3 h-3 rounded-sm ${getColor(level)}`}
                />
              ))}
            </div>
            <span>More</span>
          </div>
        </div>
      </div>
    </div>
  );
}
