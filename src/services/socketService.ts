import { io, Socket } from 'socket.io-client';

// Store for callbacks
const mockCallbacks: Record<string, Function> = {};

// Initialize Socket.io connection
export const setupSocket = (): Socket => {
  // Connect to the real backend
  const socket = io('http://localhost:3001');
  
  return socket;
};

// This function is kept for compatibility with existing code
// but won't be needed once you're using the real socket
export const simulateSocketEvent = (event: string, data: any) => {
  if (mockCallbacks[event]) {
    mockCallbacks[event](data);
  }
};