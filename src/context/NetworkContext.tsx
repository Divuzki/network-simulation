import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import { toast } from 'react-toastify';
import { Device, Connection, User } from '../types';
// import { mockDevices, mockUsers } from '../utils/mockData';
import { setupSocket } from '../services/socketService';
import { scanNetwork, getDevices, getUsers } from '../services/apiService';

interface NetworkContextType {
  devices: Device[];
  users: User[];
  connections: Connection[];
  currentUser: User | null;
  isScanning: boolean;
  scanNetwork: () => Promise<void>;
  connectToUser: (userId: string, connectionType: 'P2P' | 'LAN' | 'WLAN') => Promise<void>;
  disconnectFromUser: (connectionId: string) => Promise<void>;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export const NetworkProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Initialize with real data from the backend
  useEffect(() => {
    // Set a default current user (in a real app, this would come from authentication)
    const defaultUser: User = {
      id: 'user-1',
      name: 'Current User',
      status: 'online'
    };
    setCurrentUser(defaultUser);
    
    // Fetch initial data
    getDevices().then(response => {
      setDevices(response.data);
    }).catch(error => {
      console.error('Error fetching devices:', error);
    });
    
    getUsers().then(response => {
      setUsers(response.data);
    }).catch(error => {
      console.error('Error fetching users:', error);
    });
    
    // Initialize socket connection
    const socket = setupSocket();
    
    // Socket event handlers
    socket.on('device-update', (updatedDevices: Device[]) => {
      setDevices(prev => [...prev, ...updatedDevices.filter(d => 
        !prev.some(pd => pd.id === d.id)
      )]);
      toast.info(`${updatedDevices.length} new device(s) detected`);
    });
    
    socket.on('connection-update', (updatedConnections: Connection[]) => {
      setConnections(updatedConnections);
    });
    
    socket.on('user-update', (updatedUsers: User[]) => {
      setUsers(updatedUsers);
    });
    
    return () => {
      socket.disconnect();
    };
  }, []);

  // Network scanning function
  const handleScanNetwork = useCallback(async () => {
    setIsScanning(true);
    try {
      // Call the real backend API
      const response = await scanNetwork();
      toast.success('Network scan completed');
    } catch (error) {
      console.error('Error scanning network:', error);
      toast.error('Failed to scan network');
    } finally {
      setIsScanning(false);
    }
  }, []);

  // Connect to user function
  const handleConnectToUser = useCallback(async (userId: string, connectionType: 'P2P' | 'LAN' | 'WLAN') => {
    if (!currentUser) {
      toast.error('You must be logged in to connect');
      return;
    }
    
    try {
      // Call the real backend API
      const response = await connectToUser(userId, connectionType, currentUser.id);
      toast.success(`Connected to user via ${connectionType}`);
    } catch (error) {
      console.error('Error connecting to user:', error);
      toast.error('Failed to connect to user');
    }
  }, [currentUser]);

  // Disconnect from user function
  const handleDisconnectFromUser = useCallback(async (connectionId: string) => {
    try {
      // Call the real backend API
      await disconnectFromUser(connectionId);
      toast.info('Disconnected from user');
    } catch (error) {
      console.error('Error disconnecting from user:', error);
      toast.error('Failed to disconnect from user');
    }
  }, []);

  return (
    <NetworkContext.Provider 
      value={{
        devices,
        users,
        connections,
        currentUser,
        isScanning,
        scanNetwork: handleScanNetwork,
        connectToUser: handleConnectToUser,
        disconnectFromUser: handleDisconnectFromUser
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetwork = (): NetworkContextType => {
  const context = useContext(NetworkContext);
  if (context === undefined) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
};