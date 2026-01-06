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

type ViewMode = "daily" | "total";

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
  const [viewMode, setViewMode] = useState<ViewMode>("daily");
  const chartRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!partyId || !user) return;
      setLoadingSeries(true);
      const data = await getPartyDailySeries(partyId as string, 7, timezone);
      setSeries(data);
      setLoadingSeries(false);
    };
    load();
  }, [partyId, user, getPartyDailySeries, timezone]);

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

    const isDaily = viewMode === "daily";

    const chartLabels = series.labels.map((d) =>
      new Date(d + "T12:00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    );

    const datasets = series.series.map((s, i) => {
      const cumulative = s.data.reduce<number[]>((acc, val, idx) => {
        const prev = idx === 0 ? 0 : acc[idx - 1];
        acc.push(prev + val);
        return acc;
      }, []);
      const data = isDaily ? s.data : cumulative;
      return {
        label: s.label,
        data,
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
              label: (context) =>
                isDaily
                  ? `${context.dataset.label}: ${context.parsed.y} min`
                  : `${context.dataset.label}: ${context.parsed.y} min`,
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: isDaily ? "Minutes per day" : "Cumulative minutes (7d)",
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
  }, [series, viewMode]);

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
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <CardTitle>
              {party ? `${party.name} · Focus Over Time` : "Party Focus Over Time"}
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant={viewMode === "daily" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("daily")}
              >
                Per Day
              </Button>
              <Button
                variant={viewMode === "total" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("total")}
              >
                Total (7d)
              </Button>
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
