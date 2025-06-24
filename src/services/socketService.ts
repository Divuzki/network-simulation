import { io, Socket } from "socket.io-client";

// Store for callbacks
const mockCallbacks: Record<string, (...args: unknown[]) => void> = {};

// Initialize Socket.io connection
export const setupSocket = (): Socket => {
  // Connect to the real backend
  // Use environment variable for socket URL, defaulting to 192.168.1.173 for development
  const socketUrl =
    import.meta.env.VITE_SOCKET_URL || "http://192.168.1.173:3003";
  const socket = io(socketUrl);

  return socket;
};

// This function is kept for compatibility with existing code
// but won't be needed once you're using the real socket
export const simulateSocketEvent = (event: string, data: unknown) => {
  if (mockCallbacks[event]) {
    mockCallbacks[event](data);
  }
};
