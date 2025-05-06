import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
  useCallback,
} from "react";
import { toast } from "react-toastify";
import { Device, Connection, User } from "../types";
// import { mockDevices, mockUsers } from '../utils/mockData';
import { setupSocket } from "../services/socketService";
import { scanNetwork, getDevices, getUsers } from "../services/apiService";

interface NetworkContextType {
  devices: Device[];
  users: User[];
  connections: Connection[];
  currentUser: User | null;
  isScanning: boolean;
  scanNetwork: () => Promise<void>;
  connectToUser: (
    userId: string,
    connectionType: "P2P" | "LAN" | "WAN"
  ) => Promise<void>;
  disconnectFromUser: (connectionId: string) => Promise<void>;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export const NetworkProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Initialize with real data from the backend
  useEffect(() => {
    // Initialize socket connection
    const socket = setupSocket();

    // Register current user
    const username = prompt("Enter your name:") || `User-${Date.now()}`;
    const defaultUser: User = {
      id: `user-${Date.now()}`,
      name: username,
      status: "online",
    };

    // Register with the server
    socket.emit("register-user", defaultUser);

    // Handle successful registration
    socket.on("user-registered", (registeredUser: User) => {
      setCurrentUser(registeredUser);
      toast.success(`Welcome, ${registeredUser.name}!`);
    });

    // Socket event handlers
    socket.on("device-update", (updatedDevices: Device[]) => {
      // Properly merge devices to avoid duplicates
      setDevices((prev) => {
        const uniqueDevices = [...prev];
        updatedDevices.forEach((device) => {
          const existingIndex = uniqueDevices.findIndex(
            (d) => d.id === device.id
          );
          if (existingIndex >= 0) {
            // Update existing device
            uniqueDevices[existingIndex] = { ...device };
          } else {
            // Add new device
            uniqueDevices.push(device);
          }
        });
        return uniqueDevices;
      });

      if (updatedDevices.length > 0) {
        toast.info(`${updatedDevices.length} device(s) updated`);
      }
    });

    socket.on("connection-update", (updatedConnections: Connection[]) => {
      setConnections(updatedConnections);
    });

    socket.on("user-update", (updatedUsers: User[]) => {
      setUsers(updatedUsers);
    });

    // Fetch initial data
    getDevices()
      .then((response) => {
        setDevices(response.data);
      })
      .catch((error) => {
        console.error("Error fetching devices:", error);
      });

    // Fetch connected users
    getUsers()
      .then((response) => {
        setUsers(response.data);
      })
      .catch((error) => {
        console.error("Error fetching users:", error);
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
      toast.success("Network scan completed");
    } catch (error) {
      console.error("Error scanning network:", error);
      toast.error("Failed to scan network");
    } finally {
      setIsScanning(false);
    }
  }, []);

  // Connect to user function
  const handleConnectToUser = useCallback(
    async (userId: string, connectionType: "P2P" | "LAN" | "WAN") => {
      if (!currentUser) {
        toast.error("You must be logged in to connect");
        return;
      }

      try {
        // Call the real backend API
        const response = await connectToUser(
          userId,
          connectionType,
          currentUser.id
        );
        toast.success(`Connected to user via ${connectionType}`);
      } catch (error) {
        console.error("Error connecting to user:", error);
        toast.error("Failed to connect to user");
      }
    },
    [currentUser]
  );

  // Disconnect from user function
  const handleDisconnectFromUser = useCallback(async (connectionId: string) => {
    try {
      // Call the real backend API
      await disconnectFromUser(connectionId);
      toast.info("Disconnected from user");
    } catch (error) {
      console.error("Error disconnecting from user:", error);
      toast.error("Failed to disconnect from user");
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
        disconnectFromUser: handleDisconnectFromUser,
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetwork = (): NetworkContextType => {
  const context = useContext(NetworkContext);
  if (context === undefined) {
    throw new Error("useNetwork must be used within a NetworkProvider");
  }
  return context;
};
