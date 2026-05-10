import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Volume2,
  VolumeX,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  MessageCircle,
  Bell,
  Watch,
  Send,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  getChannels,
  createChannel,
  deleteChannel,
  updateChannel,
} from '../api/channels';
import client from '../api/client';
import { usePushSubscription } from '../hooks/usePushSubscription';

export function SettingsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [channelUsername, setChannelUsername] = useState('');
  const [channelName, setChannelName] = useState('');
  const { subscribe, isSubscribed, isSupported } = usePushSubscription();
  const [telegramLinkUrl, setTelegramLinkUrl] = useState<string | null>(null);
  const [telegramLinked, setTelegramLinked] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => client.get('/api/auth/me').then(r => r.data),
  });

  const { data: channels = [] } = useQuery({
    queryKey: ['channels'],
    queryFn: getChannels,
  });

  const toggleTtsMutation = useMutation({
    mutationFn: (ttsEnabled: boolean) =>
      client.patch('/api/auth/me', { ttsEnabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      toast.success('Налаштування оновлено');
      window.location.reload();
    },
    onError: () => toast.error('Помилка оновлення'),
  });

  const createChannelMutation = useMutation({
    mutationFn: () =>
      createChannel({
        channelUsername: channelUsername.trim(),
        name: channelName.trim(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      toast.success('Канал додано');
      setChannelUsername('');
      setChannelName('');
    },
    onError: () => toast.error('Помилка додавання каналу'),
  });

  const deleteChannelMutation = useMutation({
    mutationFn: deleteChannel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      toast.success('Канал видалено');
    },
  });

  const toggleChannelMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      updateChannel(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
    },
  });

  const handleAddChannel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelUsername.trim() || !channelName.trim()) {
      toast.error('Заповніть всі поля');
      return;
    }
    createChannelMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Налаштування</h1>
        <p className="mt-1 text-sm text-gray-500">
          Керуйте профілем та каналами моніторингу
        </p>
      </div>

      {/* Profile */}
      <div className="card">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Профіль</h2>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-500">
              Email
            </label>
            <p className="text-sm text-gray-900">{user?.email}</p>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              {user?.ttsEnabled ? (
                <Volume2 className="h-5 w-5 text-green-500" />
              ) : (
                <VolumeX className="h-5 w-5 text-gray-400" />
              )}
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Озвучення сповіщень (TTS)
                </p>
                <p className="text-xs text-gray-500">
                  Автоматичне озвучення нових сповіщень
                </p>
              </div>
            </div>
            <button
              onClick={() => toggleTtsMutation.mutate(!user?.ttsEnabled)}
              className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"
            >
              {user?.ttsEnabled ? (
                <ToggleRight className="h-6 w-6 text-green-500" />
              ) : (
                <ToggleLeft className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Push / Apple Watch */}
      <div className="card">
        <div className="mb-4 flex items-center gap-2">
          <Watch className="h-5 w-5 text-indigo-500" />
          <h2 className="text-lg font-semibold text-gray-900">
            Сповіщення на Apple Watch
          </h2>
        </div>

        {!isSupported ? (
          <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-700">
            <p className="font-medium">Відкрий цю сторінку в Safari на iPhone</p>
            <p className="mt-1 text-amber-600">
              Web Push підтримується лише в Safari. Chrome/Firefox на iOS не підтримують push-сповіщення.
            </p>
          </div>
        ) : isSubscribed ? (
          <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
            <Bell className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-sm font-medium text-green-800">Сповіщення підключені ✓</p>
              <p className="text-xs text-green-600">
                Оповіщення будуть надходити на iPhone та Apple Watch навіть при закритому браузері.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-lg bg-indigo-50 p-4 text-sm text-indigo-700">
              <p className="font-medium mb-1">Як отримувати сповіщення на годинник:</p>
              <ol className="list-decimal list-inside space-y-1 text-indigo-600">
                <li>Відкрий цю сторінку в Safari на iPhone</li>
                <li>Натисни «Поділитися» → «На екран "Домів"»</li>
                <li>Відкрий додаток з екрана та натисни кнопку нижче</li>
              </ol>
            </div>
            <button
              onClick={async () => {
                try {
                  await subscribe();
                  toast.success('Push-сповіщення підключено!');
                } catch (err) {
                  console.error('Push subscribe error:', err);
                  toast.error('Не вдалося підключити сповіщення');
                }
              }}
              className="btn-primary flex items-center gap-2"
            >
              <Bell className="h-4 w-4" />
              Підключити push-сповіщення
            </button>
          </div>
        )}
      </div>

      {/* Telegram Bot */}
      <div className="card">
        <div className="mb-4 flex items-center gap-2">
          <Send className="h-5 w-5 text-blue-500" />
          <h2 className="text-lg font-semibold text-gray-900">Telegram-бот</h2>
        </div>

        {profile?.telegramChatId || telegramLinked ? (
          <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
            <Bell className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-sm font-medium text-green-800">Telegram підключено ✓</p>
              <p className="text-xs text-green-600">Сповіщення надходять у Telegram паралельно з іншими каналами.</p>
            </div>
          </div>
        ) : telegramLinkUrl ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">Натисни кнопку нижче — відкриється бот. Він автоматично прив'яже акаунт.</p>
            <a
              href={telegramLinkUrl}
              target="_blank"
              rel="noreferrer"
              onClick={() => setTelegramLinked(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Send className="h-4 w-4" />
              Відкрити бота в Telegram
            </a>
          </div>
        ) : (
          <button
            onClick={async () => {
              try {
                const { data } = await client.get('/api/auth/telegram-link');
                if (data.url) {
                  setTelegramLinkUrl(data.url);
                } else {
                  toast.error('Бот ще не запущений, перевір TELEGRAM_BOT_TOKEN');
                }
              } catch {
                toast.error('Помилка отримання посилання');
              }
            }}
            className="btn-primary flex items-center gap-2"
          >
            <Send className="h-4 w-4" />
            Підключити Telegram-бота
          </button>
        )}
      </div>

      {/* Telegram channels */}
      <div className="card">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Telegram-канали
        </h2>

        {/* Add channel form */}
        <form onSubmit={handleAddChannel} className="mb-4 flex gap-2">
          <input
            type="text"
            value={channelName}
            onChange={(e) => setChannelName(e.target.value)}
            placeholder="Назва каналу"
            className="input-field flex-1"
          />
          <input
            type="text"
            value={channelUsername}
            onChange={(e) => setChannelUsername(e.target.value)}
            placeholder="@username"
            className="input-field flex-1"
          />
          <button
            type="submit"
            disabled={createChannelMutation.isPending}
            className="btn-primary"
          >
            <Plus className="mr-1 h-4 w-4" />
            Додати
          </button>
        </form>

        {/* Channels list */}
        {channels.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-gray-400">
            <MessageCircle className="mb-2 h-8 w-8" />
            <p className="text-sm">Каналів ще немає</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {channels.map((ch) => (
              <div key={ch.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{ch.name}</p>
                  <p className="text-xs text-gray-500">@{ch.channelUsername}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      toggleChannelMutation.mutate({
                        id: ch.id,
                        isActive: !ch.isActive,
                      })
                    }
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
                  >
                    {ch.isActive ? (
                      <ToggleRight className="h-5 w-5 text-green-500" />
                    ) : (
                      <ToggleLeft className="h-5 w-5" />
                    )}
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Видалити канал?')) {
                        deleteChannelMutation.mutate(ch.id);
                      }
                    }}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
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
