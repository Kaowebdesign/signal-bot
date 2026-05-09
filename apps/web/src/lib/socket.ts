import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(token: string): Socket {
  if (socket?.connected) return socket;
  socket = io('/', {
    auth: { token },
    transports: ['polling', 'websocket'],
    path: '/socket.io',
  });
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
