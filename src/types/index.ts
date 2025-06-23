// Device object representation
export interface Device {
  id: string;
  name: string;
  ip: string;
  mac: string;
  type: "computer" | "router" | "smartphone" | "other";
  status: "online" | "offline" | "unknown";
  isEthernet?: boolean;
  isWebsiteUser?: boolean;
}

// User object representation
export interface User {
  id: string;
  name: string;
  status: "online" | "offline" | "away";
  networkMetrics?: {
    downloadSpeed: number;
    uploadSpeed: number;
    latency: number;
    packetLoss?: number;
    throughput?: number;
    jitter?: number;
    maxBandwidth?: number;
  };
}

// Connection between nodes
export interface Connection {
  id: string;
  sourceId: string;
  targetId: string;
  type: "P2P" | "LAN" | "WAN";
  status: "active" | "inactive" | "pending";
  established: string; // ISO date string
  lastTest?: {
    uploadSpeed: number;
    downloadSpeed: number;
    latency: number;
    packetLoss: number;
    throughput: number;
    timestamp: string;
  };
}
