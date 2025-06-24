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
import { setupSocket } from "../services/socketService";
import {
  scanNetwork,
  getDevices,
  getUsers,
  connectToUser,
  disconnectFromUser,
  testConnectionBetweenUsers,
} from "../services/apiService";
import axios from "axios";

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
  canConnectToUser: (
    userId: string,
    connectionType: "P2P" | "LAN" | "WAN"
  ) => boolean;
  testConnectionBetweenUsers: (connectionId: string) => Promise<void>;
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

    // Get device name to use as username
    getDevices()
      .then((response) => {
        // Find this device or use a default name
        const thisDevice =
          response.data.find((d) => d.type === "computer") || response.data[0];
        const deviceName = thisDevice && thisDevice.name;

        // Create user with device name and persistent ID
        const getUserId = () => {
          let userId = localStorage.getItem('userId');
          if (!userId) {
            userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            localStorage.setItem('userId', userId);
          }
          return userId;
        };

        const defaultUser: User = {
          id: getUserId(),
          name: deviceName ?? null,
          status: "online",
        };

        if (defaultUser.name) {
          // Register with the server
          socket.emit("register-user", defaultUser);
        }
      })
      .catch((error) => {
        console.error("Error fetching devices:", error);
        if (axios.isAxiosError(error)) {
          toast.error(`Failed to fetch devices: ${error.message}`);
        } else {
          toast.error("Failed to fetch devices");
        }
      });

    // Handle successful registration
    socket.on("user-registered", (registeredUser: User) => {
      setCurrentUser(registeredUser);
      toast.success(`Welcome, ${registeredUser.name}!`);
    });

    // Socket event handlers
    socket.on("device-update", (updatedDevices: Device[]) => {
      setDevices((prev) => {
        const uniqueDevices = [...prev];
        updatedDevices.forEach((device) => {
          // Check for duplicates by ID, IP, or MAC address (more robust deduplication)
          const existingIndex = uniqueDevices.findIndex(
            (d) => 
              d.id === device.id ||
              (d.ip === device.ip && device.ip !== "Connected to Website") ||
              (d.mac === device.mac && device.mac !== "N/A")
          );
          if (existingIndex >= 0) {
            // Update existing device, preserving important properties
            uniqueDevices[existingIndex] = {
              ...uniqueDevices[existingIndex],
              ...device,
              // Ensure the device name is properly displayed (not an ID)
              name: device.name || uniqueDevices[existingIndex].name
            };
          } else {
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

    // Fetch initial data with better error handling
    const fetchInitialData = async () => {
      try {
        const [devicesResponse, usersResponse] = await Promise.all([
          getDevices(),
          getUsers()
        ]);

        setDevices(devicesResponse.data);
        
        const usersWithMetrics = usersResponse.data.map((u: User) => ({
          ...u,
          networkMetrics: u.networkMetrics || null,
        }));
        setUsers(usersWithMetrics);
      } catch (error) {
        if (axios.isAxiosError(error)) {
          console.error("Network error:", error.message);
          toast.error(`Failed to fetch data: ${error.message}`);
        } else {
          console.error("Error fetching data:", error);
          toast.error("Failed to fetch initial data");
        }
      }
    };

    fetchInitialData();

    return () => {
      socket.disconnect();
    };
  }, []);

  // Network scanning function
  const handleScanNetwork = useCallback(async () => {
    setIsScanning(true);
    try {
      await scanNetwork();
      toast.success("Network scan completed");
    } catch (error) {
      console.error("Error scanning network:", error);
      if (axios.isAxiosError(error)) {
        toast.error(`Scan failed: ${error.message}`);
      } else {
        toast.error("Failed to scan network");
      }
    } finally {
      setIsScanning(false);
    }
  }, []);

  // Check if a connection is allowed based on network model rules
  const canConnectToUser = useCallback(
    (userId: string, connectionType: "P2P" | "LAN" | "WAN"): boolean => {
      if (!currentUser) return false;

      if (connectionType === "P2P") {
        const sourceP2PConnections = connections.filter(
          (conn) =>
            conn.type === "P2P" &&
            (conn.sourceId === currentUser.id ||
              conn.targetId === currentUser.id)
        );

        const targetP2PConnections = connections.filter(
          (conn) =>
            conn.type === "P2P" &&
            (conn.sourceId === userId || conn.targetId === userId)
        );

        if (
          sourceP2PConnections.length > 0 ||
          targetP2PConnections.length > 0
        ) {
          return false;
        }
      }

      if (connectionType === "LAN") {
        const sourceUser = users.find((u) => u.id === currentUser.id);
        const targetUser = users.find((u) => u.id === userId);
        if (!sourceUser || !targetUser) {
          return false;
        }
      }

      const existingConnection = connections.find(
        (conn) =>
          (conn.sourceId === currentUser.id && conn.targetId === userId) ||
          (conn.sourceId === userId && conn.targetId === currentUser.id)
      );

      return !existingConnection;
    },
    [connections, currentUser, users]
  );

  // Connect to user function
  const handleConnectToUser = useCallback(
    async (userId: string, connectionType: "P2P" | "LAN" | "WAN") => {
      if (!currentUser) {
        toast.error("You must be logged in to connect");
        return;
      }

      if (!canConnectToUser(userId, connectionType)) {
        if (connectionType === "P2P") {
          toast.error("P2P connections are limited to 2 users only");
        } else {
          toast.error("Connection already exists or is not allowed");
        }
        return;
      }

      try {
        await connectToUser(
          userId,
          connectionType,
          currentUser.id
        );
        toast.success(`Connected to user via ${connectionType}`);
      } catch (error) {
        console.error("Error connecting to user:", error);
        if (axios.isAxiosError(error) && error.response?.data?.error) {
          toast.error(error.response.data.error);
        } else {
          toast.error("Failed to connect to user");
        }
      }
    },
    [currentUser, canConnectToUser]
  );

  // Disconnect from user function
  const handleDisconnectFromUser = useCallback(async (connectionId: string) => {
    try {
      await disconnectFromUser(connectionId);
      toast.info("Disconnected from user");
    } catch (error) {
      console.error("Error disconnecting from user:", error);
      if (axios.isAxiosError(error)) {
        toast.error(`Failed to disconnect: ${error.message}`);
      } else {
        toast.error("Failed to disconnect from user");
      }
    }
  }, []);

  // Test connection between users
  const handleTestConnectionBetweenUsers = useCallback(
    async (connectionId: string) => {
      try {
        await testConnectionBetweenUsers(connectionId);
      } catch (error) {
        console.error("Error testing connection:", error);
        if (axios.isAxiosError(error)) {
          toast.error(`Connection test failed: ${error.message}`);
        } else {
          toast.error("Failed to test connection");
        }
      }
    },
    []
  );

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
        canConnectToUser,
        testConnectionBetweenUsers: handleTestConnectionBetweenUsers,
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