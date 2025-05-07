const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const { exec } = require("child_process");

// Create Express app
const app = express();
app.use(cors());
app.use(express.json());

// Create HTTP server
const server = http.createServer(app);

// Create Socket.IO server
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// In-memory storage for demonstration
const devices = [];
const users = [];
const connections = [];
const socketUserMap = new Map(); // Map socket.id to userId

// --- Network metrics mock function ---
function getMockNetworkMetrics(userId) {
  // In a real implementation, gather real metrics here
  // For demo, return random values
  return {
    uploadSpeed: (Math.random() * 100 + 10).toFixed(2), // Mbps
    downloadSpeed: (Math.random() * 100 + 10).toFixed(2), // Mbps
    packetLoss: (Math.random() * 5).toFixed(2), // %
    throughput: (Math.random() * 100 + 10).toFixed(2), // Mbps
    latency: (Math.random() * 50 + 5).toFixed(2), // ms
  };
}

// API endpoints
app.post("/api/scan", (req, res) => {
  // Use arp-scan to get actual network devices
  exec("arp -a", (error, stdout) => {
    if (error) {
      console.error("Scan error:", error);
      return res.status(500).json({ error: "Scan failed" });
    }
    // Parse arp -a output
    const newDevices = parseArpOutput(stdout);
    // Remove duplicates from global devices array by IP
    for (const device of newDevices) {
      const existingIdx = devices.findIndex((d) => d.ip === device.ip);
      if (existingIdx === -1) {
        devices.push(device);
      } else {
        // Optionally update the device info if needed
        devices[existingIdx] = { ...devices[existingIdx], ...device };
      }
    }
    // Notify all clients
    io.emit("device-update", newDevices);
    res.json(newDevices);
  });
});

app.get("/api/devices", (req, res) => {
  res.json(devices);
});

app.get("/api/users", (req, res) => {
  // Attach network metrics to each user
  const usersWithMetrics = users.map((u) => ({
    ...u,
    networkMetrics: getMockNetworkMetrics(u.id),
  }));
  res.json(usersWithMetrics);
});

app.post("/api/connect", (req, res) => {
  const { userId, connectionType } = req.body;
  const sourceId = req.body.sourceId || "user-1"; // Default for demo

  // Helper to get user network (assume user has 'network' property, e.g., subnet or router IP)
  function getUserNetwork(userId) {
    const user = users.find((u) => u.id === userId);
    return user && user.network ? user.network : null;
  }

  // Check if connection is allowed based on network model rules
  if (connectionType === "P2P") {
    // For P2P connections, check if either user already has a P2P connection
    const sourceP2PConnections = connections.filter(
      (conn) =>
        conn.type === "P2P" &&
        (conn.sourceId === sourceId || conn.targetId === sourceId)
    );

    const targetP2PConnections = connections.filter(
      (conn) =>
        conn.type === "P2P" &&
        (conn.sourceId === userId || conn.targetId === userId)
    );

    // P2P connections are limited to 2 users only (1-to-1)
    if (sourceP2PConnections.length > 0 || targetP2PConnections.length > 0) {
      return res
        .status(400)
        .json({ error: "P2P connections are limited to 2 users only" });
    }
  }

  // LAN connections: only allow if both users are on the same network
  if (connectionType === "LAN") {
    const sourceNetwork = getUserNetwork(sourceId);
    const targetNetwork = getUserNetwork(userId);
    if (!sourceNetwork || !targetNetwork || sourceNetwork !== targetNetwork) {
      return res.status(400).json({
        error:
          "LAN connections are only allowed between users on the same network",
      });
    }
  }

  // Check if connection already exists between these users
  const existingConnection = connections.find(
    (conn) =>
      (conn.sourceId === sourceId && conn.targetId === userId) ||
      (conn.sourceId === userId && conn.targetId === sourceId)
  );

  if (existingConnection) {
    return res
      .status(400)
      .json({ error: "Connection already exists between these users" });
  }

  // Create new connection
  const newConnection = {
    id: `conn-${Date.now()}`,
    sourceId,
    targetId: userId,
    type: connectionType,
    status: "active",
    established: new Date().toISOString(),
  };

  connections.push(newConnection);

  // Notify all clients
  io.emit("connection-update", connections);

  res.json(newConnection);
});

app.delete("/api/connections/:id", (req, res) => {
  const { id } = req.params;

  // Remove connection
  const index = connections.findIndex((conn) => conn.id === id);
  if (index !== -1) {
    connections.splice(index, 1);

    // Notify all clients
    io.emit("connection-update", connections);

    res.status(200).json({ success: true });
  } else {
    res.status(404).json({ error: "Connection not found" });
  }
});

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log("New client connected");

  // Handle user registration
  socket.on("register-user", (userData) => {
    // Use a unique identifier for the user (e.g., userData.id or userData.name)
    let userId = userData.id || `user-${Date.now()}`;
    // Check if a user with the same name or id is already connected (regardless of device name)
    let existingUser = users.find(
      (u) => u.id === userId || u.name === userData.name
    );
    let user;
    if (existingUser) {
      // Prevent duplicate user registration (even if device name is different)
      user = { ...existingUser, status: "online" };
      // Update user in users array
      const idx = users.findIndex((u) => u.id === user.id);
      users[idx] = user;
      userId = user.id;
    } else {
      // Add new user
      user = {
        id: userId,
        name: userData.name || `User-${users.length + 1}`,
        status: "online",
      };
      users.push(user);
    }
    // Map socket to userId
    socketUserMap.set(socket.id, userId);
    // Acknowledge registration with user data
    socket.emit("user-registered", user);
    // Notify all clients about updated user list
    io.emit("user-update", users);
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    const userId = socketUserMap.get(socket.id);
    if (userId) {
      // Mark user as offline
      const userIdx = users.findIndex((u) => u.id === userId);
      if (userIdx !== -1) {
        users[userIdx].status = "offline";
      }
      // Remove mapping
      socketUserMap.delete(socket.id);
    }
    // If no users are online, clear all memory
    const onlineUsers = users.filter((u) => u.status === "online");
    if (onlineUsers.length === 0) {
      users.length = 0;
      connections.length = 0;
      devices.length = 0;
      socketUserMap.clear();
      console.log("All users disconnected. Memory cleared.");
    }
    io.emit("user-update", users);
    io.emit("connection-update", connections);
    io.emit("device-update", devices);
    console.log("Client disconnected");
  });

  // Send current data to newly connected client
  socket.emit("device-update", devices);
  socket.emit("user-update", users);
  socket.emit("connection-update", connections);
});

// Utility functions
function simulateDevices() {
  const numDevices = Math.floor(Math.random() * 3) + 1; // 1-3 devices
  const newDevices = [];

  for (let i = 0; i < numDevices; i++) {
    const deviceTypes = ["computer", "router", "smartphone"];
    const type = deviceTypes[Math.floor(Math.random() * deviceTypes.length)];

    newDevices.push({
      id: `device-${Date.now()}-${i}`,
      name: `${type}-${Math.floor(Math.random() * 100)}`,
      ip: `192.168.1.${Math.floor(Math.random() * 255)}`,
      mac: `00:1A:2B:${Math.floor(Math.random() * 100)}:${Math.floor(
        Math.random() * 100
      )}:${Math.floor(Math.random() * 100)}`,
      type,
      status: "online",
    });
  }

  return newDevices;
}

// Add this function to parse arp -a output
function parseArpOutput(output) {
  const lines = output.split("\n");
  const newDevices = [];
  for (const line of lines) {
    // Match IP and MAC addresses in arp output, and extract hostname/SSID
    // Example: divines-mbp (192.168.1.173) at a4:83:e7:68:e2:30 on en0 ifscope permanent [ethernet]
    // Example router: MyRouterSSID (192.168.1.1) at 00:1a:2b:3c:4d:5e on en0 ifscope [ethernet]
    const match = line.match(/^([\w\-]+) \(([0-9.]+)\) at ([0-9a-f:]+)/i);
    if (match) {
      const hostnameOrSSID = match[1];
      const ip = match[2];
      const mac = match[3];
      let type = "computer";
      let name = hostnameOrSSID;
      // Try to detect OS name from the hostname if possible
      // e.g., "iPhone", "android", "windows", "macbook", etc.
      const osNameMatch = hostnameOrSSID.match(
        /(iphone|android|windows|macbook|mac|ipad|linux|ubuntu|pixel|galaxy|samsung|xiaomi|huawei|oneplus|ipad|surface)/i
      );
      if (osNameMatch) {
        name = osNameMatch[0];
      }
      // Heuristic: if IP is typical router IP, treat as router and use SSID as name
      if (ip.startsWith("192.168.1.1") || ip.startsWith("10.0.0.1")) {
        type = "router";
        name = hostnameOrSSID; // SSID for router
      } else if (
        mac.toLowerCase().startsWith("a8:") ||
        mac.toLowerCase().startsWith("ac:")
      ) {
        type = "smartphone";
      }
      // Avoid duplicates by IP address
      if (!newDevices.some((d) => d.ip === ip)) {
        newDevices.push({
          id: `device-${Date.now()}-${newDevices.length}`,
          name,
          ip,
          mac,
          type,
          status: "online",
        });
      }
    }
  }
  return newDevices;
}

// You can also uncomment and rename the parseArpScanOutput function if you prefer
// function parseArpOutput(output) {
//   const lines = output.split('\n');
//   const devices = [];
//
//   for (const line of lines) {
//     if (line.includes('192.168.') || line.includes('10.0.')) {
//       const parts = line.split('\t');
//       if (parts.length >= 2) {
//         const ip = parts[0].trim();
//         const mac = parts[1].trim();
//
//         devices.push({
//           id: `device-${Date.now()}-${devices.length}`,
//           name: `Device-${devices.length + 1}`,
//           ip,
//           mac,
//           type: 'other',
//           status: 'online'
//         });
//       }
//     }
//   }
//
//   return devices;
// }

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
