"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/hooks";
import { useParties, type PartyDailySeries } from "@/lib/useParties";
import { PartyManagement } from "@/components/ui/party-management";
import { Chart } from "chart.js/auto";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useUserTimezone } from "@/lib/useUserTimezone";

type TimePeriod = "week" | "month";

export default function PartyAnalyticsPage() {
  const params = useParams();
  const partyId = useMemo(() => {
    const raw = params?.partyId;
    return Array.isArray(raw) ? raw[0] : raw;
  }, [params]);

  const { user, loading: authLoading } = useAuth(true);
  const { parties, getPartyDailySeries } = useParties(!authLoading && !!user, user?.id);
  const { timezone } = useUserTimezone();
  const router = useRouter();
  const [series, setSeries] = useState<PartyDailySeries | null>(null);
  const [loadingSeries, setLoadingSeries] = useState(false);
  const [graphPeriod, setGraphPeriod] = useState<TimePeriod>("week");
  const chartRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstance = useRef<Chart | null>(null);

  // Calculate time until Sunday reset
  const getTimeUntilReset = () => {
    const now = new Date();
    const nextSunday = new Date(now);
    nextSunday.setDate(now.getDate() + (7 - now.getDay()));
    nextSunday.setHours(0, 0, 0, 0);

    const diff = nextSunday.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days >= 1) {
      return `${days} day${days !== 1 ? 's' : ''} until reset`;
    } else {
      return `${hours} hour${hours !== 1 ? 's' : ''} until reset`;
    }
  };

  useEffect(() => {
    const load = async () => {
      if (!partyId || !user) return;
      setLoadingSeries(true);
      const data = await getPartyDailySeries(partyId as string, 'this', graphPeriod, timezone);
      setSeries(data);
      setLoadingSeries(false);
    };
    load();
  }, [partyId, user, getPartyDailySeries, timezone, graphPeriod]);

  useEffect(() => {
    if (!chartRef.current || !series || series.labels.length === 0) return;
    const ctx = chartRef.current.getContext("2d");
    if (!ctx) return;

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const palette = [
      "hsl(210, 90%, 60%)",
      "hsl(12, 85%, 60%)",
      "hsl(140, 70%, 50%)",
      "hsl(280, 70%, 60%)",
      "hsl(40, 90%, 55%)",
      "hsl(330, 75%, 60%)",
    ];

    const chartLabels = series.labels.map((d) =>
      new Date(d + "T12:00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    );

    const datasets = series.series.map((s, i) => {
      return {
        label: s.label,
        data: s.data,
        tension: 0.35,
        borderColor: palette[i % palette.length],
        backgroundColor: palette[i % palette.length] + "80",
        fill: false,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointHoverBorderWidth: 2,
        pointHoverBackgroundColor: palette[i % palette.length],
        pointHoverBorderColor: "#fff",
      };
    });

    chartInstance.current = new Chart(ctx, {
      type: "line",
      data: {
        labels: chartLabels,
        datasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
          },
          tooltip: {
            enabled: true,
            callbacks: {
              label: (context) => `${context.dataset.label}: ${context.parsed.y} min`,
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: "Minutes per day",
            },
          },
        },
      },
    });

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [series, graphPeriod]);

  const party = parties.find((p) => p.id === partyId);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/analytics")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Analytics
        </Button>
      </div>
      <PartyManagement />
      <Card className="bg-card text-foreground">
        <CardHeader>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <CardTitle>
                  {party ? `${party.name} · This Week` : "Party Focus · This Week"}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">{getTimeUntilReset()}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">View:</span>
                <div className="inline-flex rounded-md border border-border bg-secondary p-1">
                  <button
                    onClick={() => setGraphPeriod("week")}
                    className={`px-3 py-1 text-sm rounded transition-colors ${
                      graphPeriod === "week"
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground hover:bg-secondary/80"
                    }`}
                  >
                    Week
                  </button>
                  <button
                    onClick={() => setGraphPeriod("month")}
                    className={`px-3 py-1 text-sm rounded transition-colors ${
                      graphPeriod === "month"
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground hover:bg-secondary/80"
                    }`}
                  >
                    Month
                  </button>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent style={{ height: 420 }}>
          {loadingSeries && <p className="text-muted-foreground">Loading graph...</p>}
          {!loadingSeries && series && series.labels.length === 0 && (
            <p className="text-muted-foreground">No data for this party yet.</p>
          )}
          {!loadingSeries && series && series.labels.length > 0 && <canvas ref={chartRef} />}
        </CardContent>
      </Card>
    </div>
  );
}
