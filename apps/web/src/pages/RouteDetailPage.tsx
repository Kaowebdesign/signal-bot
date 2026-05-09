import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft,
  MapPin,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Calendar,
  Pencil,
  X,
  Check,
  Plus,
} from 'lucide-react';
import { getRoute, deleteRoute, updateRoute } from '../api/routes';
import type { LocationType, CreateRouteDto } from '../types';

const locationTypeLabel: Record<LocationType, string> = {
  STREET: 'Вулиця',
  LANDMARK: 'Орієнтир',
  INTERSECTION: 'Перехрестя',
  HIGHWAY: 'Шосе',
  DISTRICT: 'Район',
};

type LocDraft = { name: string; type: LocationType; orderIndex: number };

export function RouteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editLocs, setEditLocs] = useState<LocDraft[]>([]);

  const { data: route, isLoading } = useQuery({
    queryKey: ['routes', id],
    queryFn: () => getRoute(id!),
    enabled: !!id,
  });

  const toggleMutation = useMutation({
    mutationFn: (isActive: boolean) => updateRoute(id!, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      toast.success('Маршрут оновлено');
    },
  });

  const saveMutation = useMutation({
    mutationFn: (dto: Partial<CreateRouteDto>) => updateRoute(id!, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes', id] });
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      toast.success('Збережено');
      setEditing(false);
    },
    onError: () => toast.error('Помилка збереження'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteRoute(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      toast.success('Маршрут видалено');
      navigate('/routes');
    },
    onError: () => toast.error('Помилка видалення'),
  });

  const startEdit = () => {
    if (!route) return;
    setEditName(route.name);
    setEditLocs(
      [...(route.locations ?? [])]
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((l) => ({ name: l.name, type: l.type, orderIndex: l.orderIndex })),
    );
    setEditing(true);
  };

  const addLoc = () =>
    setEditLocs((p) => [...p, { name: '', type: 'STREET', orderIndex: p.length }]);

  const removeLoc = (i: number) =>
    setEditLocs((p) =>
      p.filter((_, idx) => idx !== i).map((l, idx) => ({ ...l, orderIndex: idx })),
    );

  const updateLoc = (i: number, field: 'name' | 'type', val: string) =>
    setEditLocs((p) => p.map((l, idx) => (idx === i ? { ...l, [field]: val } : l)));

  const handleSave = () => {
    if (!editName.trim()) return toast.error('Введіть назву');
    const valid = editLocs.filter((l) => l.name.trim());
    if (!valid.length) return toast.error('Додайте хоча б одну локацію');
    saveMutation.mutate({ name: editName.trim(), locations: valid });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!route) {
    return <div className="py-20 text-center text-gray-500">Маршрут не знайдено</div>;
  }

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="card p-0 overflow-hidden">
        {/* Row 1: back + name + pencil */}
        <div className="flex items-center gap-2 px-3 pt-3 pb-2">
          <button
            onClick={() => navigate('/routes')}
            className="flex-shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          {editing ? (
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="input-field flex-1 font-semibold"
            />
          ) : (
            <h1 className="flex-1 truncate text-base font-bold text-gray-900 lg:text-lg">
              {route.name}
            </h1>
          )}

          {!editing && (
            <button
              onClick={startEdit}
              className="flex-shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
              title="Редагувати"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Row 2: date + status */}
        <div className="flex items-center gap-2 border-t border-gray-100 px-4 py-2 text-xs text-gray-500">
          <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
          <span>{new Date(route.createdAt).toLocaleDateString('uk-UA')}</span>
          <span
            className={`ml-1 rounded-full px-2 py-0.5 font-medium ${
              route.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}
          >
            {route.isActive ? 'Активний' : 'Неактивний'}
          </span>
        </div>

        {/* Row 3: action buttons — full width on mobile */}
        <div className="flex gap-2 border-t border-gray-100 px-3 py-2.5">
          {editing ? (
            <>
              <button
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className="btn-primary flex-1 justify-center py-2 text-sm"
              >
                <Check className="mr-1.5 h-4 w-4" />
                {saveMutation.isPending ? 'Збереження...' : 'Зберегти'}
              </button>
              <button
                onClick={() => setEditing(false)}
                className="btn-secondary flex-1 justify-center py-2 text-sm"
              >
                Скасувати
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => toggleMutation.mutate(!route.isActive)}
                disabled={toggleMutation.isPending}
                className="btn-secondary flex-1 justify-center py-2 text-sm"
              >
                {route.isActive ? (
                  <><ToggleRight className="mr-1.5 h-4 w-4 text-green-500" />Вимкнути</>
                ) : (
                  <><ToggleLeft className="mr-1.5 h-4 w-4" />Увімкнути</>
                )}
              </button>
              <button
                onClick={() => { if (confirm('Видалити маршрут?')) deleteMutation.mutate(); }}
                disabled={deleteMutation.isPending}
                className="btn-danger flex-1 justify-center py-2 text-sm"
              >
                <Trash2 className="mr-1.5 h-4 w-4" />
                Видалити
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Locations ── */}
      <div className="card">
        <h2 className="mb-3 text-base font-semibold text-gray-900">Локації / ключові слова</h2>

        {editing ? (
          <div className="space-y-2">
            {editLocs.map((loc, idx) => (
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
                {editLocs.length > 1 && (
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
            <button
              type="button"
              onClick={addLoc}
              className="mt-1 flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              <Plus className="h-4 w-4" />
              Додати локацію
            </button>
          </div>
        ) : route.locations.length === 0 ? (
          <p className="text-sm text-gray-400">Немає локацій</p>
        ) : (
          <div className="space-y-2">
            {[...route.locations]
              .sort((a, b) => a.orderIndex - b.orderIndex)
              .map((loc, idx) => (
                <div
                  key={loc.id}
                  className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5"
                >
                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">
                    {idx + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-gray-900">{loc.name}</p>
                    <p className="text-xs text-gray-400">{locationTypeLabel[loc.type]}</p>
                  </div>
                  <MapPin className="h-4 w-4 flex-shrink-0 text-gray-300" />
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
