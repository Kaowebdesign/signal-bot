import { useQuery } from '@tanstack/react-query';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { BarChart2, TrendingUp, MapPin, Clock, AlertTriangle } from 'lucide-react';
import { getStats } from '../api/stats';

// Fill in missing days in the last 30 days with 0
function fillDailyTimeline(data: { date: string; count: number }[]) {
  const map = new Map(data.map((d) => [d.date, d.count]));
  const days: { date: string; label: string; count: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' });
    days.push({ date: iso, label, count: map.get(iso) ?? 0 });
  }
  return days;
}

// Fill all 24 hours with 0 for missing ones
function fillHourly(data: { hour: number; count: number }[]) {
  const map = new Map(data.map((d) => [d.hour, d.count]));
  return Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    label: `${h}:00`,
    count: map.get(h) ?? 0,
  }));
}

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  color = 'blue',
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color?: 'blue' | 'orange' | 'red' | 'green';
}) {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600',
    orange: 'bg-orange-50 text-orange-600',
    red: 'bg-red-50 text-red-600',
    green: 'bg-green-50 text-green-600',
  };
  return (
    <div className="card flex items-start gap-3">
      <div className={`flex-shrink-0 rounded-lg p-2 ${colorMap[color]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="mt-0.5 truncate text-xl font-bold text-gray-900">{value}</p>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
    </div>
  );
}

const tooltipStyle = {
  contentStyle: {
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    fontSize: '12px',
  },
};

export function StatsPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: getStats,
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card h-20 animate-pulse bg-gray-100" />
          ))}
        </div>
        <div className="card h-56 animate-pulse bg-gray-100" />
        <div className="card h-48 animate-pulse bg-gray-100" />
      </div>
    );
  }

  if (!stats) return null;

  const timeline = fillDailyTimeline(stats.dailyTimeline);
  const hourly = fillHourly(stats.hourlyDistribution);
  const topRoute = stats.routeStats[0];
  const topLocation = stats.locationStats[0];

  // Best travel window: find 3-hour block with fewest alerts
  const hourlyMax = Math.max(...hourly.map((h) => h.count), 1);

  // Today's date in YYYY-MM-DD
  const todayKey = new Date().toISOString().slice(0, 10);
  const todayCount = stats.dailyTimeline.find((d) => d.date === todayKey)?.count ?? 0;

  return (
    <div className="space-y-4 lg:space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Статистика</h1>
        <p className="mt-1 text-sm text-gray-500">Аналіз перехоплених повідомлень</p>
      </div>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <MetricCard
          icon={BarChart2}
          label="Всього сповіщень"
          value={stats.total}
          color="blue"
        />
        <MetricCard
          icon={TrendingUp}
          label="Сьогодні"
          value={todayCount}
          sub={`за 7 днів: ${stats.routeStats.reduce((s, r) => s + r.last7d, 0)}`}
          color="orange"
        />
        <MetricCard
          icon={MapPin}
          label="Проблемний маршрут"
          value={topRoute?.name ?? '—'}
          sub={topRoute ? `${topRoute.total} сповіщень` : undefined}
          color="red"
        />
        <MetricCard
          icon={AlertTriangle}
          label="Гаряча точка"
          value={topLocation?.location ?? '—'}
          sub={topLocation ? `${topLocation.count} разів` : undefined}
          color="orange"
        />
      </div>

      {/* ── Daily activity chart ── */}
      <div className="card">
        <h2 className="mb-4 text-sm font-semibold text-gray-700">Активність за 30 днів</h2>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={timeline} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10 }}
              interval="preserveStartEnd"
              tickLine={false}
            />
            <YAxis tick={{ fontSize: 10 }} allowDecimals={false} tickLine={false} />
            <Tooltip
              {...tooltipStyle}
              formatter={(v) => [v, 'Сповіщень']}
              labelFormatter={(l) => `Дата: ${l}`}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#blueGrad)"
              dot={false}
              activeDot={{ r: 4 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ── Route stats + locations ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Routes */}
        <div className="card">
          <h2 className="mb-4 text-sm font-semibold text-gray-700">Маршрути за кількістю сповіщень</h2>
          {stats.routeStats.length === 0 ? (
            <p className="text-sm text-gray-400">Немає даних</p>
          ) : (
            <div className="space-y-2">
              {stats.routeStats.map((r) => {
                const maxTotal = stats.routeStats[0].total || 1;
                const pct = (r.total / maxTotal) * 100;
                return (
                  <div key={r.id}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-medium text-gray-700 truncate mr-2">{r.name}</span>
                      <span className="flex-shrink-0 text-gray-500">
                        {r.total} · 7д: {r.last7d} · 30д: {r.last30d}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-blue-500 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top locations */}
        <div className="card">
          <h2 className="mb-4 text-sm font-semibold text-gray-700">Топ локацій</h2>
          {stats.locationStats.length === 0 ? (
            <p className="text-sm text-gray-400">Немає даних</p>
          ) : (
            <div className="space-y-1.5">
              {stats.locationStats.slice(0, 10).map((loc, i) => {
                const maxCount = stats.locationStats[0].count || 1;
                const pct = (loc.count / maxCount) * 100;
                const rank = i + 1;
                return (
                  <div key={loc.location} className="flex items-center gap-2">
                    <span
                      className={`w-5 flex-shrink-0 text-center text-xs font-bold ${
                        rank === 1
                          ? 'text-red-500'
                          : rank === 2
                            ? 'text-orange-400'
                            : rank === 3
                              ? 'text-yellow-400'
                              : 'text-gray-300'
                      }`}
                    >
                      {rank}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="truncate text-xs font-medium text-gray-700">
                          {loc.location}
                        </span>
                        <span className="ml-2 flex-shrink-0 text-xs text-gray-400">
                          {loc.count}
                        </span>
                      </div>
                      <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full bg-orange-400"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Hourly distribution ── */}
      <div className="card">
        <div className="mb-1 flex items-center gap-2">
          <Clock className="h-4 w-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-700">Активність за годинами доби</h2>
        </div>
        <p className="mb-4 text-xs text-gray-400">
          Показує в який час доби найчастіше надходять сповіщення
        </p>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={hourly} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 9 }}
              tickLine={false}
              interval={3}
            />
            <YAxis tick={{ fontSize: 10 }} allowDecimals={false} tickLine={false} />
            <Tooltip
              {...tooltipStyle}
              formatter={(v) => [v, 'Сповіщень']}
              labelFormatter={(l) => `Час: ${l}`}
            />
            <Bar
              dataKey="count"
              radius={[3, 3, 0, 0]}
              maxBarSize={24}
              fill="#f97316"
            >
              {hourly.map((entry) => {
                const intensity = hourlyMax > 0 ? entry.count / hourlyMax : 0;
                const color =
                  intensity > 0.7
                    ? '#ef4444'
                    : intensity > 0.4
                      ? '#f97316'
                      : intensity > 0.1
                        ? '#fbbf24'
                        : '#e5e7eb';
                return <rect key={entry.hour} fill={color} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-3 flex items-center justify-end gap-3 text-[10px] text-gray-400">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-sm bg-red-500" /> Висока активність
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-sm bg-amber-400" /> Середня
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-sm bg-gray-200" /> Тихо
          </span>
        </div>
      </div>

      {/* ── Last 7 days per route (mini chart) ── */}
      {stats.routeStats.length > 0 && (
        <div className="card">
          <h2 className="mb-4 text-sm font-semibold text-gray-700">
            Порівняння маршрутів (останні 7 днів)
          </h2>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart
              data={stats.routeStats}
              margin={{ top: 4, right: 4, left: -20, bottom: 40 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10 }}
                tickLine={false}
                angle={-20}
                textAnchor="end"
                interval={0}
              />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} tickLine={false} />
              <Tooltip
                {...tooltipStyle}
                formatter={(v) => [v, 'За 7 днів']}
              />
              <Bar dataKey="last7d" name="7 днів" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
