import { io, Socket } from 'socket.io-client';

// Initialize Socket.io connection
export const setupSocket = (): Socket => {
  // In a real implementation, connect to your backend
  // const socket = io('http://localhost:5000');
  
  // For now, create a mock socket that doesn't actually connect
  const mockSocket = {
    on: (event: string, callback: Function) => {
      // Store callbacks for simulation purposes
      mockCallbacks[event] = callback;
      return mockSocket;
    },
    emit: (event: string, data: any) => {
      console.log(`Emitted ${event} with data:`, data);
      return mockSocket;
    },
    disconnect: () => {
      console.log('Socket disconnected');
      // Clear all mock callbacks
      Object.keys(mockCallbacks).forEach(key => {
        delete mockCallbacks[key];
      });
    }
  } as unknown as Socket;
  
  return mockSocket;
};

// Store callbacks for simulation
const mockCallbacks: Record<string, Function> = {};

// Simulate receiving a socket event - for testing purposes
export const simulateSocketEvent = (event: string, data: any) => {
  if (mockCallbacks[event]) {
    mockCallbacks[event](data);
  }
};