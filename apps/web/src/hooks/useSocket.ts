import { useEffect, useState, useRef, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getSocket, disconnectSocket } from '../lib/socket';
import type { Notification } from '../types';

interface UseSocketOptions {
  onNotification?: (notification: Notification) => void;
}

export function useSocket(options: UseSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const queryClient = useQueryClient();
  const onNotificationRef = useRef(options.onNotification);

  onNotificationRef.current = options.onNotification;

  const connect = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const s = getSocket(token);
    socketRef.current = s;

    s.on('connect', () => {
      setIsConnected(true);
    });

    s.on('disconnect', () => {
      setIsConnected(false);
    });

    s.on('notification', (notification: Notification) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });

      toast.warning('Попередження', {
        description: notification.locationMatch,
      });

      onNotificationRef.current?.(notification);
    });
  }, [queryClient]);

  useEffect(() => {
    connect();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token') {
        disconnectSocket();
        setIsConnected(false);
        if (e.newValue) {
          connect();
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      disconnectSocket();
      setIsConnected(false);
    };
  }, [connect]);

  return {
    socket: socketRef.current,
    isConnected,
  };
}
