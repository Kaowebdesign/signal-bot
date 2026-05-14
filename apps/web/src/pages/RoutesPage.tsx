import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Plus,
  MapPin,
  Trash2,
  ToggleLeft,
  ToggleRight,
  ChevronRight,
  Route as RouteIcon,
  Pencil,
  X,
  Check,
  BarChart2,
} from 'lucide-react';
import { getRoutes, createRoute, deleteRoute, updateRoute } from '../api/routes';
import type { CreateRouteDto, LocationType, Route } from '../types';

const locationTypeLabel: Record<LocationType, string> = {
  STREET: 'Вулиця',
  LANDMARK: 'Орієнтир',
  INTERSECTION: 'Перехрестя',
  HIGHWAY: 'Шосе',
  DISTRICT: 'Район',
};

type LocDraft = { name: string; type: LocationType; orderIndex: number };

function RouteForm({
  initial,
  onSave,
  onCancel,
  isPending,
  title,
}: {
  initial?: { name: string; locations: LocDraft[] };
  onSave: (name: string, locations: LocDraft[]) => void;
  onCancel: () => void;
  isPending: boolean;
  title: string;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [locations, setLocations] = useState<LocDraft[]>(
    initial?.locations ?? [{ name: '', type: 'STREET', orderIndex: 0 }],
  );

  const addLoc = () =>
    setLocations((p) => [...p, { name: '', type: 'STREET', orderIndex: p.length }]);

  const removeLoc = (i: number) =>
    setLocations((p) => p.filter((_, idx) => idx !== i).map((l, idx) => ({ ...l, orderIndex: idx })));

  const updateLoc = (i: number, field: 'name' | 'type', val: string) =>
    setLocations((p) => p.map((l, idx) => (idx === i ? { ...l, [field]: val } : l)));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Введіть назву маршруту');
    const valid = locations.filter((l) => l.name.trim());
    if (!valid.length) return toast.error('Додайте хоча б одну локацію');
    onSave(name.trim(), valid);
  };

  return (
    <div className="card">
      <h2 className="mb-4 text-base font-semibold text-gray-900">{title}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Назва</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Наприклад: Дім — Робота"
            className="input-field"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Ключові слова / локації</label>
          <div className="space-y-2">
            {locations.map((loc, idx) => (
              <div key={idx} className="flex gap-2">
                <input
                  type="text"
                  value={loc.name}
                  onChange={(e) => updateLoc(idx, 'name', e.target.value)}
                  placeholder="Назва"
                  className="input-field flex-1 min-w-0"
                />
                <select
                  value={loc.type}
                  onChange={(e) => updateLoc(idx, 'type', e.target.value)}
                  className="input-field w-28 flex-shrink-0"
                >
                  {(Object.entries(locationTypeLabel) as [LocationType, string][]).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
                {locations.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeLoc(idx)}
                    className="flex-shrink-0 rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addLoc}
            className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            + Додати
          </button>
        </div>

        <div className="flex gap-2">
          <button type="submit" disabled={isPending} className="btn-primary">
            <Check className="mr-1.5 h-4 w-4" />
            {isPending ? 'Збереження...' : 'Зберегти'}
          </button>
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Скасувати
          </button>
        </div>
      </form>
    </div>
  );
}

function RouteCard({
  route,
  onToggle,
  onToggleStats,
  onDelete,
  onEdit,
}: {
  route: Route;
  onToggle: () => void;
  onToggleStats: () => void;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const MAX_VISIBLE = 3;
  const locs = route.locations ?? [];
  const visible = locs.slice(0, MAX_VISIBLE);
  const extra = locs.length - MAX_VISIBLE;

  return (
    <div className="card p-0 overflow-hidden">
      {/* Top row */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900 truncate">{route.name}</span>
            <span
              className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                route.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
              }`}
            >
              {route.isActive ? 'Активний' : 'Вимк.'}
            </span>
            <span
              className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                route.trackStats ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'
              }`}
              title={route.trackStats ? 'Статистика збирається' : 'Статистика вимкнена'}
            >
              Стат.
            </span>
          </div>
          {/* Locations row */}
          {locs.length > 0 && (
            <div className="mt-1.5 flex flex-wrap items-center gap-1">
              {visible.map((loc) => (
                <span
                  key={loc.id}
                  className="inline-flex items-center gap-0.5 rounded-md bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600"
                >
                  <MapPin className="h-2.5 w-2.5 flex-shrink-0" />
                  {loc.name}
                </span>
              ))}
              {extra > 0 && (
                <span className="text-xs text-gray-400">+{extra}</span>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-shrink-0 items-center gap-0.5">
          <button
            onClick={onEdit}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            title="Редагувати"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={onToggleStats}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"
            title={route.trackStats ? 'Вимкнути збір статистики' : 'Увімкнути збір статистики'}
          >
            <BarChart2 className={`h-4 w-4 ${route.trackStats ? 'text-blue-500' : 'text-gray-300'}`} />
          </button>
          <button
            onClick={onToggle}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"
            title={route.isActive ? 'Деактивувати' : 'Активувати'}
          >
            {route.isActive
              ? <ToggleRight className="h-5 w-5 text-green-500" />
              : <ToggleLeft className="h-5 w-5" />}
          </button>
          <button
            onClick={onDelete}
            className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500"
            title="Видалити"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <Link
            to={`/routes/${route.id}`}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"
          >
            <ChevronRight className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export function RoutesPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: routes = [], isLoading } = useQuery({
    queryKey: ['routes'],
    queryFn: getRoutes,
  });

  const createMutation = useMutation({
    mutationFn: createRoute,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      toast.success('Маршрут створено');
      setShowCreate(false);
    },
    onError: () => toast.error('Помилка створення'),
  });

  const editMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Partial<CreateRouteDto> }) =>
      updateRoute(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      toast.success('Маршрут оновлено');
      setEditingId(null);
    },
    onError: () => toast.error('Помилка оновлення'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteRoute,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      toast.success('Маршрут видалено');
    },
    onError: () => toast.error('Помилка видалення'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      updateRoute(id, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['routes'] }),
  });

  const toggleStatsMutation = useMutation({
    mutationFn: ({ id, trackStats }: { id: string; trackStats: boolean }) =>
      updateRoute(id, { trackStats }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['routes'] }),
  });

  return (
    <div className="space-y-4">
      {/* Header — compact on mobile */}
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-lg font-bold text-gray-900 lg:text-2xl">Маршрути</h1>
        <button
          className="btn-primary flex-shrink-0 py-2 text-sm"
          onClick={() => { setShowCreate((v) => !v); setEditingId(null); }}
        >
          <Plus className="mr-1 h-4 w-4" />
          <span className="hidden sm:inline">Новий маршрут</span>
          <span className="sm:hidden">Новий</span>
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <RouteForm
          title="Новий маршрут"
          onSave={(name, locs) => createMutation.mutate({ name, locations: locs })}
          onCancel={() => setShowCreate(false)}
          isPending={createMutation.isPending}
        />
      )}

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : routes.length === 0 ? (
        <div className="card flex flex-col items-center py-16 text-gray-400">
          <RouteIcon className="mb-3 h-10 w-10" />
          <p className="font-medium">Маршрутів ще немає</p>
          <p className="mt-1 text-sm">Створіть перший маршрут для моніторингу</p>
        </div>
      ) : (
        <div className="space-y-2">
          {routes.map((route) =>
            editingId === route.id ? (
              <RouteForm
                key={route.id}
                title={`Редагування: ${route.name}`}
                initial={{
                  name: route.name,
                  locations: (route.locations ?? [])
                    .sort((a, b) => a.orderIndex - b.orderIndex)
                    .map((l) => ({ name: l.name, type: l.type, orderIndex: l.orderIndex })),
                }}
                onSave={(name, locs) =>
                  editMutation.mutate({ id: route.id, dto: { name, locations: locs } })
                }
                onCancel={() => setEditingId(null)}
                isPending={editMutation.isPending}
              />
            ) : (
              <RouteCard
                key={route.id}
                route={route}
                onToggle={() => toggleMutation.mutate({ id: route.id, isActive: !route.isActive })}
                onToggleStats={() => toggleStatsMutation.mutate({ id: route.id, trackStats: !route.trackStats })}
                onDelete={() => {
                  if (confirm('Видалити маршрут?')) deleteMutation.mutate(route.id);
                }}
                onEdit={() => { setEditingId(route.id); setShowCreate(false); }}
              />
            ),
          )}
        </div>
      )}
    </div>
  );
}
