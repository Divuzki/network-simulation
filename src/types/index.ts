// Device object representation
export interface Device {
  id: string;
  name: string;
  ip: string;
  mac: string;
  type: "computer" | "router" | "smartphone" | "other";
  status: "online" | "offline" | "unknown";
}

// User object representation
export interface User {
  id: string;
  name: string;
  status: "online" | "offline" | "away";
}

// Connection between nodes
export interface Connection {
  id: string;
  sourceId: string;
  targetId: string;
  type: "P2P" | "LAN" | "WAN";
  status: "active" | "inactive" | "pending";
  established: string; // ISO date string
}
