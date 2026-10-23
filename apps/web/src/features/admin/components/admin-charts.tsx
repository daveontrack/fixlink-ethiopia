"use client";

import { BarChart3, BriefcaseBusiness, CalendarDays } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  ChartContainer,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { AdminOverview, StatusCount } from "@/lib/admin/analytics";

function ChartCard({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  icon: typeof BarChart3;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
      <div className="mb-5 flex items-start gap-3">
        <span className="role-soft-panel grid size-9 shrink-0 place-items-center rounded-xl">
          <Icon className="size-4" aria-hidden />
        </span>
        <div>
          <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function ChartMessage({ unavailable = false, children }: {
  unavailable?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      role={unavailable ? "alert" : "status"}
      className="flex h-64 items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-6 text-center text-sm text-muted-foreground"
    >
      {children}
    </div>
  );
}

const AXIS_TICK = { fontSize: 11, fill: "var(--muted-foreground)" };

function StatusChart({
  data,
  label,
}: {
  data: StatusCount[] | null;
  label: string;
}) {
  if (data === null) {
    return <ChartMessage unavailable>{label} data is unavailable.</ChartMessage>;
  }
  if (data.length === 0) {
    return <ChartMessage>No {label.toLowerCase()} data in this date range.</ChartMessage>;
  }

  return (
    <ChartContainer
      className="h-64 w-full"
      config={{ count: { label, color: "var(--chart-1)" } }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barCategoryGap="24%">
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="status"
            tick={AXIS_TICK}
            tickFormatter={(status: string) => status.replaceAll("_", " ")}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
          />
          <YAxis
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            width={32}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ fill: "var(--role-soft)", opacity: 0.45 }}
            content={<ChartTooltipContent />}
          />
          <Bar dataKey="count" fill="var(--color-count)" radius={[8, 8, 0, 0]} maxBarSize={44} />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}

export function AdminCharts({ overview }: { overview: AdminOverview }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <ChartCard
        title="Requests by status"
        description="Current request state for requests created in this range."
        icon={BarChart3}
      >
        <StatusChart data={overview.requestsByStatus} label="Requests" />
      </ChartCard>

      <ChartCard
        title="Quotations by status"
        description="Quotation activity for quotations created in this range."
        icon={BriefcaseBusiness}
      >
        <StatusChart data={overview.quotationsByStatus} label="Quotations" />
      </ChartCard>

      <ChartCard
        title="Bookings created over time"
        description="Persisted monthly booking counts; last 12 months by default, or the selected range."
        icon={CalendarDays}
      >
        {overview.bookingsByMonth === null ? (
          <ChartMessage unavailable>Booking data is unavailable.</ChartMessage>
        ) : overview.bookingsByMonth.length === 0 ? (
          <ChartMessage>No booking data in this date range.</ChartMessage>
        ) : (
          <ChartContainer
            className="h-64 w-full"
            config={{ bookings: { label: "Bookings", color: "var(--chart-2)" } }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={overview.bookingsByMonth}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="month" tick={AXIS_TICK} tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={36} allowDecimals={false} />
                <Tooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="bookings"
                  stroke="var(--color-bookings)"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}
      </ChartCard>

      <ChartCard
        title="Most requested services"
        description="Categories from real job requests created in this range."
        icon={BriefcaseBusiness}
      >
        {overview.topCategories === null ? (
          <ChartMessage unavailable>Category data is unavailable.</ChartMessage>
        ) : overview.topCategories.length === 0 ? (
          <ChartMessage>No service requests in this date range.</ChartMessage>
        ) : (
          <ol className="divide-y divide-border/70">
            {overview.topCategories.map((category, index) => (
              <li key={category.name} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-muted text-xs font-semibold text-muted-foreground">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{category.name}</span>
                <span className="text-sm tabular-nums text-muted-foreground">{category.requests}</span>
              </li>
            ))}
          </ol>
        )}
      </ChartCard>
    </div>
  );
}
