import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSocket } from './useSocket';
import { useTTS } from './useTTS';
import { useAuth } from '../context/AuthContext';
import type { Notification } from '../types';

export function useNotifications() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { speak } = useTTS();

  const handleNotification = useCallback(
    (notification: Notification) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });

      if (user?.ttsEnabled) {
        speak(`Внимание на ${notification.locationMatch}. ${notification.message?.text ?? ''}`);
      }
    },
    [user?.ttsEnabled, speak, queryClient],
  );

  const { isConnected } = useSocket({ onNotification: handleNotification });

  return { isConnected };
}
