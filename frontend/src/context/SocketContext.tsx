import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface SeatUpdateData {
  showId: string;
  seatIds: string[];
  status: 'AVAILABLE' | 'HELD' | 'BOOKED';
  holdExpiresAt?: string | null;
  heldByUserId?: string | null;
}

interface SocketContextType {
  socket: Socket | null;
  joinShow: (showId: string) => void;
  leaveShow: (showId: string) => void;
  onSeatUpdate: (callback: (data: SeatUpdateData) => void) => () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const socketInstance = io(window.location.origin, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketInstance.on('connect', () => {
      // console.log('Connected to WebSocket server:', socketInstance.id);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  const joinShow = (showId: string) => {
    if (socket) {
      socket.emit('join:show', { showId });
    }
  };

  const leaveShow = (showId: string) => {
    if (socket) {
      socket.emit('leave:show', { showId });
    }
  };

  const onSeatUpdate = (callback: (data: SeatUpdateData) => void) => {
    if (!socket) return () => {};
    socket.on('seat:status_changed', callback);
    return () => {
      socket.off('seat:status_changed', callback);
    };
  };

  return (
    <SocketContext.Provider value={{ socket, joinShow, leaveShow, onSeatUpdate }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocket must be used within a SocketProvider');
  return context;
};
