import React, { useState, useEffect } from "react";
import { X, Link, User, AlertTriangle, Activity, Zap } from "lucide-react";
import { useNetwork } from "../../context/NetworkContext";
import { User as UserType, Connection } from "../../types";

interface ConnectionModalProps {
  onClose: () => void;
}

const ConnectionModal: React.FC<ConnectionModalProps> = ({ onClose }) => {
  const {
    users,
    currentUser,
    connectToUser,
    canConnectToUser,
    connections,
    testConnectionBetweenUsers,
  } = useNetwork();
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [selectedUserMetrics, setSelectedUserMetrics] = useState<UserType['networkMetrics'] | null>(null);
  const [connectionType, setConnectionType] = useState<"P2P" | "LAN" | "WAN">(
    "P2P"
  );
  const [canConnect, setCanConnect] = useState<boolean>(false);
  const [connectionMessage, setConnectionMessage] = useState<string>("");
  const [isTestingConnection, setIsTestingConnection] =
    useState<boolean>(false);
  const [activeConnection, setActiveConnection] = useState<string | null>(null);

  // Check connection status whenever user or connection type changes
  useEffect(() => {
    if (selectedUser) {
      const isConnectionAllowed = canConnectToUser(
        selectedUser,
        connectionType
      );
      setCanConnect(isConnectionAllowed);

      if (!isConnectionAllowed) {
        if (connectionType === "P2P") {
          setConnectionMessage(
            "P2P connections are limited to 2 users only (1-to-1)"
          );
        } else {
          setConnectionMessage("Connection already exists or is not allowed");
        }
      } else {
        setConnectionMessage("");
      }
    } else {
      setCanConnect(false);
      setConnectionMessage("");
    }
    if (selectedUser) {
      const user = users.find((u) => u.id === selectedUser);
      setSelectedUserMetrics(user?.networkMetrics || null);
    } else {
      setSelectedUserMetrics(null);
    }
  }, [selectedUser, users]);
  const handleConnect = async () => {
    if (!selectedUser || !canConnect) return;

    await connectToUser(selectedUser, connectionType);
    onClose();
  };

  // Filter out current user from the list
  const availableUsers = users.filter(
    (user) => currentUser && user.id !== currentUser.id
  );

  // Find existing connections with the current user
  const userConnections = connections.filter(
    (conn) =>
      currentUser &&
      (conn.sourceId === currentUser.id || conn.targetId === currentUser.id)
  );

  // Handle network test between connected users
  const handleTestConnection = async (connectionId: string) => {
    setIsTestingConnection(true);
    setActiveConnection(connectionId);
    try {
      await testConnectionBetweenUsers(connectionId);
    } catch (error) {
      console.error("Error testing connection:", error);
    } finally {
      setIsTestingConnection(false);
    }
  };

  // Get the other user in a connection
  const getOtherUserInConnection = (connection: Connection) => {
    if (!currentUser) return null;
    const otherUserId =
      connection.sourceId === currentUser.id
        ? connection.targetId
        : connection.sourceId;
    return users.find((u) => u.id === otherUserId);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content relative overflow-auto max-md:h-[80%]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center modal-header">
          <h3 className="flex items-center space-x-2">
            <Link className="h-5 w-5 text-blue-500" />
            <span>Connect to User</span>
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-6">
          {userConnections.length > 0 && (
            <div className="mb-6">
              <h4 className="font-medium mb-3">Your Active Connections</h4>
              <div className="space-y-3">
                {userConnections.map((connection) => {
                  const otherUser = getOtherUserInConnection(connection);
                  if (!otherUser) return null;

                  return (
                    <div
                      key={connection.id}
                      className="p-3 border rounded-lg bg-white dark:bg-gray-800"
                    >
                      <div className="flex flex-wrap justify-between items-center">
                        <div className="flex items-center space-x-2">
                          <User className="h-5 w-5 text-blue-500" />
                          <span className="font-medium">{otherUser.name}</span>
                          <span className="text-xs px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                            {connection.type}
                          </span>
                        </div>
                        <button
                          onClick={() => handleTestConnection(connection.id)}
                          className="flex items-center space-x-1 text-sm px-2 py-1 rounded bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
                          disabled={isTestingConnection}
                        >
                          {isTestingConnection &&
                          activeConnection === connection.id ? (
                            <>
                              <Activity className="h-4 w-4 animate-pulse" />
                              <span>Testing...</span>
                            </>
                          ) : (
                            <>
                              <Zap className="h-4 w-4" />
                              <span>Test Connection</span>
                            </>
                          )}
                        </button>
                      </div>

                      {connection.lastTest && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="text-xs uppercase tracking-wider text-gray-500 mb-2">
                            Last Test Results
                          </div>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                            <div>
                              <span className="block text-xs text-gray-500">
                                Download
                              </span>
                              <span className="font-bold text-blue-600 dark:text-blue-400">
                                {connection.lastTest.downloadSpeed.toFixed(2)}{" "}
                                Mbps
                              </span>
                            </div>
                            <div>
                              <span className="block text-xs text-gray-500">
                                Upload
                              </span>
                              <span className="font-bold text-green-600 dark:text-green-400">
                                {connection.lastTest.uploadSpeed.toFixed(2)}{" "}
                                Mbps
                              </span>
                            </div>
                            <div>
                              <span className="block text-xs text-gray-500">
                                Latency
                              </span>
                              <span className="font-bold text-purple-600 dark:text-purple-400">
                                {connection.lastTest.latency.toFixed(2)} ms
                              </span>
                            </div>
                            <div>
                              <span className="block text-xs text-gray-500">
                                Packet Loss
                              </span>
                              <span className="font-bold text-red-600 dark:text-red-400">
                                {connection.lastTest.packetLoss.toFixed(2)}%
                              </span>
                            </div>
                          </div>
                          <div className="mt-2">
                            <div className="text-xs text-gray-500 mb-1">
                              Connection Quality
                            </div>
                            <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className={`absolute top-0 left-0 h-full rounded-full ${getConnectionQualityColor(
                                  connection.lastTest
                                )}`}
                                style={{
                                  width: `${getConnectionQualityPercentage(
                                    connection.lastTest
                                  )}%`,
                                }}
                              ></div>
                            </div>
                            <div className="mt-1 text-xs font-medium text-right">
                              {getConnectionQualityLabel(connection.lastTest)}
                            </div>
                          </div>
                          <div className="mt-1 text-xs text-gray-500 text-right">
                            Tested:{" "}
                            {new Date(
                              connection.lastTest.timestamp
                            ).toLocaleString()}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mb-4">
            <label htmlFor="user-select" className="block mb-2 font-medium">
              Select User
            </label>
            {availableUsers.length > 0 ? (
              <select
                id="user-select"
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="w-full p-2 border rounded mb-4"
              >
                <option value="">Select a user...</option>
                {availableUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.status})
                  </option>
                ))}
              </select>
            ) : (
              <div className="text-gray-500 mb-4">No other users available</div>
            )}
            {selectedUserMetrics && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-4 border border-blue-100 dark:border-blue-900">
                {/* Fast.com style UI for bandwidth */}
                <div className="mb-4 text-center">
                  <div className="text-xs uppercase tracking-wider text-gray-500 mb-1">
                    Download Speed
                  </div>
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {selectedUserMetrics.downloadSpeed}
                    <span className="text-lg ml-1">Mbps</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="block text-xs uppercase tracking-wider text-gray-500">
                      Upload Speed
                    </span>
                    <span className="font-bold text-green-600 dark:text-green-400">
                      {selectedUserMetrics.uploadSpeed} Mbps
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs uppercase tracking-wider text-gray-500">
                      Bandwidth
                    </span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">
                      {selectedUserMetrics.maxBandwidth ||
                        selectedUserMetrics.downloadSpeed +
                          selectedUserMetrics.uploadSpeed}{" "}
                      Mbps
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs uppercase tracking-wider text-gray-500">
                      Packet Loss
                    </span>
                    <span className="font-bold text-red-600 dark:text-red-400">
                      {selectedUserMetrics.packetLoss} %
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs uppercase tracking-wider text-gray-500">
                      Throughput
                    </span>
                    <span className="font-bold text-green-600 dark:text-green-400">
                      {selectedUserMetrics.throughput} Mbps
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs uppercase tracking-wider text-gray-500">
                      Latency
                    </span>
                    <span className="font-bold text-purple-600 dark:text-purple-400">
                      {selectedUserMetrics.latency} ms
                    </span>
                  </div>
                  {selectedUserMetrics.jitter && (
                    <div>
                      <span className="block text-xs uppercase tracking-wider text-gray-500">
                        Jitter
                      </span>
                      <span className="font-bold text-orange-600 dark:text-orange-400">
                        {selectedUserMetrics.jitter} ms
                      </span>
                    </div>
                  )}
                </div>

                {/* Connection quality indicator */}
                <div className="mt-4">
                  <div className="text-xs uppercase tracking-wider text-gray-500 mb-2">
                    Connection Quality
                  </div>
                  <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`absolute top-0 left-0 h-full rounded-full ${getConnectionQualityColor(
                        selectedUserMetrics
                      )}`}
                      style={{
                        width: `${getConnectionQualityPercentage(
                          selectedUserMetrics
                        )}%`,
                      }}
                    ></div>
                  </div>
                  <div className="mt-1 text-xs font-medium text-right">
                    {getConnectionQualityLabel(selectedUserMetrics)}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mb-4">
            <label className="block mb-2 font-medium">Connection Type</label>
            <div className="grid grid-cols-3 gap-3">
              <ConnectionTypeButton
                type="P2P"
                selected={connectionType === "P2P"}
                onClick={() => setConnectionType("P2P")}
              />
              <ConnectionTypeButton
                type="LAN"
                selected={connectionType === "LAN"}
                onClick={() => setConnectionType("LAN")}
              />
              <ConnectionTypeButton
                type="WAN"
                selected={connectionType === "WAN"}
                onClick={() => setConnectionType("WAN")}
              />
            </div>
          </div>

          <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-md">
            <h4 className="text-sm font-semibold mb-2">
              About {connectionType} Connections
            </h4>
            {connectionType === "P2P" ? (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Peer-to-Peer connections establish a direct link between users,
                without going through a central server. Limited to 1-to-1
                connections only.
              </p>
            ) : connectionType === "LAN" ? (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Local Area Network connections require both users to be on the same network and connected via Ethernet cable. This ensures secure local network communication.
              </p>
            ) : (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Wide Area Network connections allow any user to connect to others regardless of their network location or connection type.
              </p>
            )}

            {connectionMessage && (
              <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded flex items-start">
                <AlertTriangle className="h-4 w-4 text-yellow-500 dark:text-yellow-400 mr-2 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-yellow-700 dark:text-yellow-300">
                  {connectionMessage}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className={`btn btn-primary flex items-center space-x-2 ${
              !selectedUser || !canConnect
                ? "opacity-50 cursor-not-allowed"
                : ""
            }`}
            onClick={handleConnect}
            disabled={!selectedUser || !canConnect}
          >
            <User className="h-5 w-5" />
            <span>Connect</span>
          </button>
        </div>
      </div>
    </div>
  );
};

interface ConnectionTypeButtonProps {
  type: "P2P" | "LAN" | "WAN";
  selected: boolean;
  onClick: () => void;
}

const ConnectionTypeButton: React.FC<ConnectionTypeButtonProps> = ({
  type,
  selected,
  onClick,
}) => {
  const baseClasses =
    "p-3 rounded-md border text-center cursor-pointer transition-all";
  const selectedClasses = selected
    ? type === "P2P"
      ? "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
      : type === "LAN"
      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400"
      : "border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400"
    : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500";

  return (
    <div className={`${baseClasses} ${selectedClasses}`} onClick={onClick}>
      <span className="text-sm font-medium">{type}</span>
    </div>
  );
};

// Helper functions for connection quality
const getConnectionQualityPercentage = (metrics: UserType['networkMetrics']): number => {
  if (!metrics) return 0;
  // Calculate a quality score based on download speed, upload speed, and latency
  const downloadScore = Math.min(metrics.downloadSpeed / 100, 1) * 40; // 40% weight
  const uploadScore = Math.min(metrics.uploadSpeed / 50, 1) * 30; // 30% weight
  const latencyScore =
    Math.max(0, Math.min((200 - metrics.latency) / 200, 1)) * 30; // 30% weight

  return Math.min(Math.round(downloadScore + uploadScore + latencyScore), 100);
};

const getConnectionQualityColor = (metrics: UserType['networkMetrics']): string => {
  const quality = getConnectionQualityPercentage(metrics);
  if (quality >= 80) return "bg-green-500";
  if (quality >= 60) return "bg-blue-500";
  if (quality >= 40) return "bg-yellow-500";
  if (quality >= 20) return "bg-orange-500";
  return "bg-red-500";
};

const getConnectionQualityLabel = (metrics: UserType['networkMetrics']): string => {
  const quality = getConnectionQualityPercentage(metrics);
  if (quality >= 80) return "Excellent";
  if (quality >= 60) return "Good";
  if (quality >= 40) return "Average";
  if (quality >= 20) return "Poor";
  return "Very Poor";
};

export default ConnectionModal;
