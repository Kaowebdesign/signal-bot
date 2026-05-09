import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, AlertTriangle, TrendingUp, Activity, Trash2, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { getRoutes } from '../api/routes';
import {
  getNotifications,
  getUnreadCount,
  deleteNotification,
  deleteAllNotifications,
} from '../api/notifications';
import type { Notification } from '../types';

export function DashboardPage() {
  const queryClient = useQueryClient();

  const { data: routes = [] } = useQuery({ queryKey: ['routes'], queryFn: getRoutes });
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: getUnreadCount,
  });
  const { data: notificationsData } = useQuery({
    queryKey: ['notifications', 'dashboard'],
    queryFn: () => getNotifications(1, 10),
  });

  const deleteOneMutation = useMutation({
    mutationFn: deleteNotification,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
    onError: () => toast.error('Помилка видалення'),
  });

  const deleteAllMutation = useMutation({
    mutationFn: deleteAllNotifications,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Сповіщення очищено');
    },
    onError: () => toast.error('Помилка очищення'),
  });

  const activeRoutes = routes.filter((r) => r.isActive).length;
  const recentNotifications: Notification[] = notificationsData?.data ?? [];

  const stats = [
    { label: 'Маршрутів', value: routes.length, icon: MapPin, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Активних', value: activeRoutes, icon: Activity, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Непрочит.', value: unreadCount, icon: Bell, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Всього', value: notificationsData?.total ?? 0, icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900 lg:text-2xl">Дашборд</h1>

      {/* Stats — compact 4-col row on mobile, stays 4-col */}
      <div className="grid grid-cols-4 gap-2 lg:gap-4">
        {stats.map((s) => (
          <div key={s.label} className="card flex flex-col items-center gap-1 p-3 text-center lg:flex-row lg:gap-4 lg:p-5 lg:text-left">
            <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg lg:h-11 lg:w-11 lg:rounded-xl ${s.bg}`}>
              <s.icon className={`h-4 w-4 lg:h-6 lg:w-6 ${s.color}`} />
            </div>
            <div>
              <p className="text-[11px] leading-none text-gray-500 lg:text-sm">{s.label}</p>
              <p className="text-lg font-bold text-gray-900 lg:text-2xl">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent notifications */}
      <div className="card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900 lg:text-lg">Останні сповіщення</h2>
          {recentNotifications.length > 0 && (
            <button
              onClick={() => deleteAllMutation.mutate()}
              disabled={deleteAllMutation.isPending}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-red-500 hover:bg-red-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Очистити
            </button>
          )}
        </div>

        {recentNotifications.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-gray-400">
            <AlertTriangle className="mb-2 h-8 w-8" />
            <p className="text-sm">Сповіщень поки немає</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {recentNotifications.map((n) => (
              <div key={n.id} className="flex items-start gap-2 py-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-orange-400" />
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700">
                      {n.locationMatch}
                    </span>
                    {n.route?.name && (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                        {n.route.name}
                      </span>
                    )}
                    <span className="text-xs text-gray-400">
                      {new Date(n.createdAt).toLocaleString('uk-UA')}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-gray-700">{n.message?.text ?? '—'}</p>
                </div>
                <div className="flex flex-shrink-0 items-center gap-1">
                  {!n.isRead && <div className="h-2 w-2 rounded-full bg-blue-500" />}
                  <button
                    onClick={() => deleteOneMutation.mutate(n.id)}
                    disabled={deleteOneMutation.isPending}
                    className="rounded p-1 text-gray-300 hover:bg-red-50 hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
