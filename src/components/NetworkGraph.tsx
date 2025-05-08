import React, { useEffect, useRef, useState } from "react";
import { Network } from "vis-network";
import { DataSet } from "vis-data";
import { useNetwork } from "../context/NetworkContext";
import { getNodeOptions, getEdgeOptions } from "../utils/networkOptions";

interface NetworkGraphProps {
  onEducationClick: (topic: string) => void;
}

const NetworkGraph: React.FC<NetworkGraphProps> = ({ onEducationClick }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<Network | null>(null);
  const { devices, users, connections } = useNetwork();
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  useEffect(() => {
    // Only create the network if the container exists
    if (!containerRef.current) return;

    // Create nodes for devices and users
    const nodes = new DataSet([
      ...devices.map((device) => ({
        id: device.id,
        label: device.name,
        group: device.type,
        title: `${device.name} (${device.ip})`,
      })),
      ...users.map((user) => ({
        id: user.id,
        label: user.name,
        group: "user",
        title: user.name,
      })),
    ]);

    // Create edges for connections
    const edges = new DataSet(
      connections.map((connection) => ({
        id: connection.id,
        from: connection.sourceId,
        to: connection.targetId,
        label: connection.type,
        dashes: connection.type !== "P2P",
        color: {
          color:
            connection.type === "P2P"
              ? "#10B981"
              : connection.type === "LAN"
              ? "#3B82F6"
              : "#8B5CF6",
          highlight:
            connection.type === "P2P"
              ? "#059669"
              : connection.type === "LAN"
              ? "#2563EB"
              : "#7C3AED",
        },
        title: connection.lastTest
          ? `${
              connection.type
            } connection | Download: ${connection.lastTest.downloadSpeed.toFixed(
              2
            )} Mbps | Upload: ${connection.lastTest.uploadSpeed.toFixed(
              2
            )} Mbps | Latency: ${connection.lastTest.latency.toFixed(
              2
            )} ms | Last tested: ${new Date(
              connection.lastTest.timestamp
            ).toLocaleString()}`
          : `${connection.type} connection established ${new Date(
              connection.established
            ).toLocaleString()}`,
      }))
    );

    // Create the network
    const network = new Network(
      containerRef.current,
      { nodes, edges },
      {
        nodes: getNodeOptions(),
        edges: getEdgeOptions(),
        physics: {
          enabled: true,
          barnesHut: {
            gravitationalConstant: -2000,
            centralGravity: 0.3,
            springLength: 150,
            springConstant: 0.04,
          },
          stabilization: {
            iterations: 1000,
          },
        },
        interaction: {
          hover: true,
          tooltipDelay: 200,
          hideEdgesOnDrag: true,
          navigationButtons: true,
        },
      }
    );

    // Event listeners
    network.on("click", (params) => {
      if (params.nodes.length > 0) {
        const nodeId = params.nodes[0];
        const node = nodes.get(nodeId);

        if (node) {
          // Check if it's a device or user
          const device = devices.find((d) => d.id === nodeId);
          const user = users.find((u) => u.id === nodeId);

          if (device) {
            onEducationClick(device.type);
          } else if (user) {
            onEducationClick("user-connection");
          }
        }
      } else if (params.edges.length > 0) {
        const edgeId = params.edges[0];
        const edge = edges.get(edgeId);

        if (edge) {
          onEducationClick(edge.label.toLowerCase());
        }
      }
    });

    network.on("hoverNode", (params) => {
      setHoveredNode(params.node);
    });

    network.on("blurNode", () => {
      setHoveredNode(null);
    });

    // Save the network instance
    networkRef.current = network;

    // Cleanup function
    return () => {
      if (networkRef.current) {
        networkRef.current.destroy();
      }
    };
  }, [devices, users, connections, onEducationClick]);

  // Update the network when data changes
  useEffect(() => {
    if (!networkRef.current) return;

    const network = networkRef.current;

    // Update nodes and edges when data changes
    const nodes = network.body.data.nodes;
    const edges = network.body.data.edges;

    // Update nodes
    const currentNodeIds = new Set(nodes.getIds());

    // Add new devices
    devices.forEach((device) => {
      if (!currentNodeIds.has(device.id)) {
        nodes.add({
          id: device.id,
          label: device.name,
          group: device.type,
          title: `${device.name} (${device.ip})`,
        });
      }
    });

    // Add new users
    users.forEach((user) => {
      if (!currentNodeIds.has(user.id)) {
        nodes.add({
          id: user.id,
          label: user.name,
          group: "user",
          title: user.name,
        });
      }
    });

    // Update edges
    const currentEdgeIds = new Set(edges.getIds());

    // Add new connections
    connections.forEach((connection) => {
      if (!currentEdgeIds.has(connection.id)) {
        edges.add({
          id: connection.id,
          from: connection.sourceId,
          to: connection.targetId,
          label: connection.type,
          dashes: connection.type !== "P2P",
          color: {
            color:
              connection.type === "P2P"
                ? "#10B981"
                : connection.type === "LAN"
                ? "#3B82F6"
                : "#8B5CF6",
            highlight:
              connection.type === "P2P"
                ? "#059669"
                : connection.type === "LAN"
                ? "#2563EB"
                : "#7C3AED",
          },
          title: connection.lastTest
            ? `${
                connection.type
              } connection | Download: ${connection.lastTest.downloadSpeed.toFixed(
                2
              )} Mbps | Upload: ${connection.lastTest.uploadSpeed.toFixed(
                2
              )} Mbps | Latency: ${connection.lastTest.latency.toFixed(
                2
              )} ms | Last tested: ${new Date(
                connection.lastTest.timestamp
              ).toLocaleString()}`
            : `${connection.type} connection established ${new Date(
                connection.established
              ).toLocaleString()}`,
        });
      }
    });

    // Remove connections that no longer exist
    edges.getIds().forEach((id) => {
      if (!connections.some((c) => c.id === id)) {
        edges.remove(id);
      }
    });
  }, [devices, users, connections]);

  return (
    <div className="relative h-full">
      <div ref={containerRef} className="network-canvas" />
      {hoveredNode && (
        <div className="absolute bottom-4 right-4 bg-white dark:bg-gray-800 p-3 rounded-md shadow-md border border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold mb-1">Node Information</h3>
          {devices.find((d) => d.id === hoveredNode) ? (
            <DeviceInfo deviceId={hoveredNode} />
          ) : (
            <UserInfo userId={hoveredNode} />
          )}
        </div>
      )}
    </div>
  );
};

// Helper components for node information
const DeviceInfo: React.FC<{ deviceId: string }> = ({ deviceId }) => {
  const { devices } = useNetwork();
  const device = devices.find((d) => d.id === deviceId);
  const [metrics, setMetrics] = React.useState<any>(null);
  const [bandwidth, setBandwidth] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);
  const [speedTesting, setSpeedTesting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<"info" | "metrics">("info");

  React.useEffect(() => {
    setMetrics(null);
    setBandwidth(null);
    setError(null);
    setActiveTab("info");
  }, [deviceId]);

  const handleTestNetwork = async () => {
    if (!device) return;
    setLoading(true);
    setError(null);
    try {
      const res = await import("../services/apiService").then((m) =>
        m.getDeviceMetrics(device.id)
      );
      setMetrics(res.data);
      setActiveTab("metrics");

      // Also fetch bandwidth information
      const bwRes = await import("../services/apiService").then((m) =>
        m.getDeviceBandwidth(device.id)
      );
      setBandwidth(bwRes.data);
    } catch (e) {
      setError("Failed to fetch network metrics");
    } finally {
      setLoading(false);
    }
  };

  const handleSpeedTest = async () => {
    if (!device) return;
    setSpeedTesting(true);
    setError(null);
    try {
      const res = await import("../services/apiService").then((m) =>
        m.getDeviceMetrics(device.id)
      );
      setBandwidth(res.data);
      setActiveTab("metrics");
    } catch (e) {
      setError("Failed to run speed test");
    } finally {
      setSpeedTesting(false);
    }
  };

  if (!device) return null;

  return (
    <div className="text-sm w-72">
      <div className="flex mb-3 border-b border-gray-200 dark:border-gray-700">
        <button
          className={`px-3 py-2 ${
            activeTab === "info"
              ? "border-b-2 border-blue-500 font-medium"
              : "text-gray-500"
          }`}
          onClick={() => setActiveTab("info")}
        >
          Device Info
        </button>
        <button
          className={`px-3 py-2 ${
            activeTab === "metrics"
              ? "border-b-2 border-blue-500 font-medium"
              : "text-gray-500"
          }`}
          onClick={() => setActiveTab("metrics")}
          disabled={!metrics && !bandwidth}
        >
          Network Metrics
        </button>
      </div>

      {activeTab === "info" && (
        <div>
          <p>
            <span className="font-medium">Name:</span> {device.name}
          </p>
          <p>
            <span className="font-medium">IP:</span> {device.ip}
          </p>
          <p>
            <span className="font-medium">MAC:</span> {device.mac}
          </p>
          <p>
            <span className="font-medium">Type:</span> {device.type}
          </p>
          <p>
            <span className="font-medium">Status:</span> {device.status}
          </p>
          <div className="flex space-x-2 mt-3">
            <button
              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs flex-1"
              onClick={handleTestNetwork}
              disabled={loading}
            >
              {loading ? "Testing..." : "Test Network"}
            </button>
            <button
              className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-xs flex-1"
              onClick={handleSpeedTest}
              disabled={speedTesting}
            >
              {speedTesting ? "Testing..." : "Speed Test"}
            </button>
          </div>
          {error && <p className="text-red-500 mt-1 text-xs">{error}</p>}
        </div>
      )}

      {activeTab === "metrics" && (metrics || bandwidth) && (
        <div className="mt-2">
          {/* Fast.com style UI for bandwidth */}
          {bandwidth && (
            <div className="mb-4 text-center p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div className="text-xs uppercase tracking-wider text-gray-500 mb-1">
                Download Speed
              </div>
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {bandwidth.downloadSpeed}
                <span className="text-lg ml-1">Mbps</span>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3 text-center">
                <div>
                  <div className="text-xs uppercase tracking-wider text-gray-500">
                    Upload
                  </div>
                  <div className="font-bold text-green-600 dark:text-green-400">
                    {bandwidth.uploadSpeed}
                    <span className="text-xs ml-1">Mbps</span>
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-gray-500">
                    Bandwidth
                  </div>
                  <div className="font-bold text-purple-600 dark:text-purple-400">
                    {bandwidth.maxBandwidth}
                    <span className="text-xs ml-1">Mbps</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Other metrics in a clean, modern format */}
          {metrics && (
            <div className="grid grid-cols-2 gap-2">
              <MetricCard
                label="Latency"
                value={`${metrics.latency} ms`}
                color="blue"
              />
              <MetricCard
                label="Packet Loss"
                value={`${metrics.packetLoss}%`}
                color="red"
              />
              <MetricCard
                label="Throughput"
                value={`${metrics.throughput} Mbps`}
                color="green"
              />
              <MetricCard
                label="Jitter"
                value={metrics.jitter ? `${metrics.jitter} ms` : "N/A"}
                color="purple"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Helper component for displaying metrics in a card format
const MetricCard: React.FC<{
  label: string;
  value: string;
  color: "red" | "blue" | "green" | "purple";
}> = ({ label, value, color }) => {
  const colorClasses = {
    red: "text-red-600 dark:text-red-400",
    blue: "text-blue-600 dark:text-blue-400",
    green: "text-green-600 dark:text-green-400",
    purple: "text-purple-600 dark:text-purple-400",
  };

  return (
    <div className="p-2 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-800">
      <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
      <div className={`font-bold ${colorClasses[color]}`}>{value}</div>
    </div>
  );
};

const UserInfo: React.FC<{ userId: string }> = ({ userId }) => {
  const { users, connections } = useNetwork();
  const user = users.find((u) => u.id === userId);
  const [metrics, setMetrics] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<"info" | "metrics">("info");

  React.useEffect(() => {
    setMetrics(null);
    setError(null);
    setActiveTab("info");

    // If user has networkMetrics, set them
    if (user && user.networkMetrics) {
      setMetrics(user.networkMetrics);
    }
  }, [userId, user]);

  const handleTestNetwork = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      // Simulate fetching user network metrics
      const apiService = await import("../services/apiService");
      const res = await apiService.getDeviceMetrics(user.id);
      setMetrics(res.data);
      setActiveTab("metrics");
    } catch (e) {
      setError("Failed to test connection");
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  const userConnections = connections.filter(
    (c) => c.sourceId === userId || c.targetId === userId
  );

  return (
    <div className="text-sm w-72">
      <div className="flex mb-3 border-b border-gray-200 dark:border-gray-700">
        <button
          className={`px-3 py-2 ${
            activeTab === "info"
              ? "border-b-2 border-blue-500 font-medium"
              : "text-gray-500"
          }`}
          onClick={() => setActiveTab("info")}
        >
          User Info
        </button>
        <button
          className={`px-3 py-2 ${
            activeTab === "metrics"
              ? "border-b-2 border-blue-500 font-medium"
              : "text-gray-500"
          }`}
          onClick={() => setActiveTab("metrics")}
          disabled={!metrics}
        >
          Network Metrics
        </button>
      </div>

      {activeTab === "info" && (
        <div>
          <p>
            <span className="font-medium">Name:</span> {user.name}
          </p>
          <p>
            <span className="font-medium">Status:</span> {user.status}
          </p>
          <p>
            <span className="font-medium">Connections:</span>{" "}
            {userConnections.length}
          </p>
          <button
            className="mt-3 w-full px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs"
            onClick={handleTestNetwork}
            disabled={loading}
          >
            {loading ? "Testing..." : "Test Connection Speed"}
          </button>
          {error && <p className="text-red-500 mt-1 text-xs">{error}</p>}
        </div>
      )}

      {activeTab === "metrics" && metrics && (
        <div className="mt-2">
          {/* Fast.com style UI for bandwidth */}
          <div className="mb-4 text-center p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="text-xs uppercase tracking-wider text-gray-500 mb-1">
              Download Speed
            </div>
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {metrics.downloadSpeed}
              <span className="text-lg ml-1">Mbps</span>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3 text-center">
              <div>
                <div className="text-xs uppercase tracking-wider text-gray-500">
                  Upload
                </div>
                <div className="font-bold text-green-600 dark:text-green-400">
                  {metrics.uploadSpeed}
                  <span className="text-xs ml-1">Mbps</span>
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-gray-500">
                  Latency
                </div>
                <div className="font-bold text-purple-600 dark:text-purple-400">
                  {metrics.latency}
                  <span className="text-xs ml-1">ms</span>
                </div>
              </div>
            </div>
          </div>

          {/* Connection quality indicator */}
          <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg border border-gray-200 dark:border-gray-800">
            <div className="text-xs uppercase tracking-wider text-gray-500 mb-2">
              Connection Quality
            </div>
            <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`absolute top-0 left-0 h-full rounded-full ${getQualityColor(
                  metrics
                )}`}
                style={{ width: `${getQualityPercentage(metrics)}%` }}
              ></div>
            </div>
            <div className="mt-1 text-xs font-medium text-right">
              {getQualityLabel(metrics)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper functions for connection quality
const getQualityPercentage = (metrics: any): number => {
  // Calculate a quality score based on download speed, upload speed, and latency
  const downloadScore = Math.min(metrics.downloadSpeed / 100, 1) * 40; // 40% weight
  const uploadScore = Math.min(metrics.uploadSpeed / 50, 1) * 30; // 30% weight
  const latencyScore =
    Math.max(0, Math.min((200 - metrics.latency) / 200, 1)) * 30; // 30% weight

  return Math.min(Math.round(downloadScore + uploadScore + latencyScore), 100);
};

const getQualityColor = (metrics: any): string => {
  const quality = getQualityPercentage(metrics);
  if (quality >= 80) return "bg-green-500";
  if (quality >= 60) return "bg-blue-500";
  if (quality >= 40) return "bg-yellow-500";
  if (quality >= 20) return "bg-orange-500";
  return "bg-red-500";
};

const getQualityLabel = (metrics: any): string => {
  const quality = getQualityPercentage(metrics);
  if (quality >= 80) return "Excellent";
  if (quality >= 60) return "Good";
  if (quality >= 40) return "Average";
  if (quality >= 20) return "Poor";
  return "Very Poor";
};

export default NetworkGraph;
