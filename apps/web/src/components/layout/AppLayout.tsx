import { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  LayoutDashboard,
  MapPin,
  Settings,
  Bell,
  LogOut,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../hooks/useNotifications';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from '../../api/notifications';
import type { Notification } from '../../types';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Дашборд' },
  { to: '/routes', icon: MapPin, label: 'Маршрути' },
  { to: '/settings', icon: Settings, label: 'Налаштування' },
];

function severityColor(severity: string) {
  switch (severity) {
    case 'CRITICAL': return 'text-red-500';
    case 'HIGH': return 'text-orange-500';
    case 'MEDIUM': return 'text-yellow-500';
    default: return 'text-blue-500';
  }
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  useNotifications();
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: getUnreadCount,
    refetchInterval: 15_000,
  });

  const { data: notificationsData } = useQuery({
    queryKey: ['notifications', 'recent'],
    queryFn: () => getNotifications(1, 10),
    enabled: bellOpen,
  });

  const markReadMutation = useMutation({
    mutationFn: markAsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: markAllAsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const notifications: Notification[] = notificationsData?.data ?? [];

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── Sidebar (desktop only) ── */}
      <aside className="hidden lg:flex w-64 flex-shrink-0 flex-col bg-gray-900">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-gray-800 px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
            <MapPin className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold text-white">SignalBot</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="border-t border-gray-800 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-700 text-sm font-medium text-gray-300">
              {user?.email?.charAt(0).toUpperCase()}
            </div>
            <p className="min-w-0 flex-1 truncate text-sm font-medium text-gray-200">
              {user?.email}
            </p>
          </div>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 lg:h-16 lg:px-6">
          {/* Mobile: app name */}
          <span className="text-base font-bold text-gray-900 lg:hidden">SignalBot</span>
          {/* Desktop: spacer */}
          <div className="hidden flex-1 lg:block" />

          <div className="flex items-center gap-1">
            {/* Bell */}
            <div className="relative" ref={bellRef}>
              <button
                className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                onClick={() => setBellOpen((v) => !v)}
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-0.5 text-[10px] font-bold text-white">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {bellOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
                  <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                    <h3 className="text-sm font-semibold text-gray-900">Сповіщення</h3>
                    {unreadCount > 0 && (
                      <button
                        className="text-xs font-medium text-blue-600 hover:text-blue-700"
                        onClick={() => markAllReadMutation.mutate()}
                      >
                        Прочитати все
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center text-sm text-gray-400">Немає сповіщень</div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`flex cursor-pointer items-start gap-3 border-b border-gray-50 px-4 py-3 transition-colors hover:bg-gray-50 ${!n.isRead ? 'bg-blue-50/50' : ''}`}
                          onClick={() => { if (!n.isRead) markReadMutation.mutate(n.id); setBellOpen(false); }}
                        >
                          <AlertTriangle className={`mt-0.5 h-4 w-4 flex-shrink-0 ${severityColor(n.severity)}`} />
                          <div className="min-w-0 flex-1">
                            <div className="mb-0.5 flex items-center gap-1.5">
                              <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700">
                                {n.locationMatch}
                              </span>
                              <span className="text-xs text-gray-400">
                                {new Date(n.createdAt).toLocaleString('uk-UA')}
                              </span>
                            </div>
                            <p className="line-clamp-2 text-xs text-gray-600">{n.message?.text ?? '—'}</p>
                          </div>
                          {!n.isRead && <div className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" />}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Logout */}
            <button
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
              onClick={() => { logout(); navigate('/login'); }}
              title="Вийти"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Page content — extra bottom padding on mobile for tab bar */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 pb-20 lg:p-6 lg:pb-6">
          {children}
        </main>
      </div>

      {/* ── Bottom tab bar (mobile only) ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-gray-200 bg-white lg:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors ${
                isActive ? 'text-blue-600' : 'text-gray-400'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className={`h-5 w-5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
