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

        // Create user with device name
        const defaultUser: User = {
          id: `user-${Date.now()}`,
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
      });
    }, [devices])

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

        // Create user with device name
        const defaultUser: User = {
          id: `user-${Date.now()}`,
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
      });

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

    // Fetch network metrics for all users and merge into user objects
    getUsers()
      .then((response) => {
        const usersWithMetrics = response.data.map((u: any) => ({
          ...u,
          networkMetrics: u.networkMetrics || null,
        }));
        setUsers(usersWithMetrics);
      })
      .catch((error) => {
        console.error("Error fetching user metrics:", error);
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

  // Check if a connection is allowed based on network model rules
  const canConnectToUser = useCallback(
    (userId: string, connectionType: "P2P" | "LAN" | "WAN"): boolean => {
      if (!currentUser) return false;

      // For P2P connections, check if either user already has a P2P connection
      if (connectionType === "P2P") {
        // Count existing P2P connections for both users
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

        // P2P connections are limited to 2 users only (1-to-1)
        if (
          sourceP2PConnections.length > 0 ||
          targetP2PConnections.length > 0
        ) {
          return false;
        }
      }

      // For LAN connections, only allow if both users are on the same network
      if (connectionType === "LAN") {
        const sourceUser = users.find((u) => u.id === currentUser.id);
        const targetUser = users.find((u) => u.id === userId);
        if (
          !sourceUser ||
          !targetUser ||
          !sourceUser.network ||
          !targetUser.network ||
          sourceUser.network !== targetUser.network
        ) {
          return false;
        }
      }

      // Check if connection already exists between these users
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

      // Check if connection is allowed based on network model rules
      if (!canConnectToUser(userId, connectionType)) {
        if (connectionType === "P2P") {
          toast.error("P2P connections are limited to 2 users only");
        } else {
          toast.error("Connection already exists or is not allowed");
        }
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
        // Display specific error message from server if available
        if (
          error.response &&
          error.response.data &&
          error.response.data.error
        ) {
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
      // Call the real backend API
      await disconnectFromUser(connectionId);
      toast.info("Disconnected from user");
    } catch (error) {
      console.error("Error disconnecting from user:", error);
      toast.error("Failed to disconnect from user");
    }
  }, []);

  // Test connection between users
  const handleTestConnectionBetweenUsers = useCallback(
    async (connectionId: string) => {
      try {
        await testConnectionBetweenUsers(connectionId);
      } catch (error) {
        console.error("Error testing connection:", error);
        toast.error("Failed to test connection");
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
