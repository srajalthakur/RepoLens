import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;

export function useSocket(jobId, handlers) {
  const socketRef = useRef(null);
  const handlersRef = useRef(handlers);

  // Keep handlers ref current without re-connecting
  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    if (!jobId) return;

    const socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.emit('join', { jobId });

    // Register stable wrappers that call the latest handlers ref
    const events = Object.keys(handlersRef.current);
    events.forEach((event) => {
      socket.on(event, (...args) => handlersRef.current[event]?.(...args));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [jobId]);

  return socketRef;
}