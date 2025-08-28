// hooks/useSocket.ts
import { useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';

export const useSocket = (roomId: string | null) => {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!roomId) return;

    // Connect to the socket server
    const newSocket = io(); // Assumes server is on the same host

    newSocket.on('connect', () => {
      console.log('Socket connected!');
      newSocket.emit('joinRoom', roomId);
    });

    setSocket(newSocket);

    // Disconnect on cleanup
    return () => {
      newSocket.disconnect();
    };
  }, [roomId]);

  return socket;
};