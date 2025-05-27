const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const { exec } = require("child_process");

// Create Express app
const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from the React app
const path = require("path");
app.use(express.static(path.join(__dirname, "../dist")));

// Create HTTP server
const server = http.createServer(app);

// Create Socket.IO server
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Simple AI chatbot responses
const chatbotResponses = {
  help: "I can help you understand network concepts and how to use this network visualization application. Try asking about network topology, connections, or how to use specific features.",
  network: "A network is a collection of computers, servers, and other devices that are connected together to share resources and communicate. This application helps you visualize and understand network topologies.",
  topology: "Network topology refers to the arrangement of elements in a network. Common topologies include star, mesh, bus, and ring. This application allows you to visualize different network topologies.",
  connection: "Connections represent how devices communicate with each other. In this application, you can create different types of connections like LAN or P2P between devices.",
  p2p: "P2P (Peer-to-Peer) is a network model where computers can communicate directly without a central server. In this application, P2P connections are limited to 1-to-1 connections.",
  lan: "LAN (Local Area Network) connects computers in a limited area like a home, office, or building. In this application, LAN connections require devices to be on the same subnet or both connected via Ethernet.",
  scan: "The scan feature discovers devices on your local network. Click the 'Scan Network' button to find devices connected to your network.",
  metrics: "Network metrics include upload/download speed, latency, packet loss, and throughput. These metrics help you understand the performance of your network connections.",
  default: "I'm a simple network assistant. I can help with basic network concepts and how to use this application. Try asking about network topology, connections, or specific features."
};

// In-memory storage for demonstration
const devices = [];
const users = [];
const connections = [];
const socketUserMap = new Map(); // Map socket.id to userId

// --- Network metrics ---
const util = require("util");
const execAsync = util.promisify(exec);

// Cache for speedtest-cli results
const speedTestCache = {
  data: null,
  timestamp: 0,
  ttl: 5 * 60 * 1000, // 5 minutes TTL
};

// Chatbot endpoint
app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;
    const lowercaseMessage = message.toLowerCase();
    
    let response = chatbotResponses.default;

    // Check for keywords in the message
    for (const [key, value] of Object.entries(chatbotResponses)) {
      if (lowercaseMessage.includes(key)) {
        response = value;
        break;
      }
    }

    res.json({ response });
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({ error: "Failed to get response" });
  }
});

async function getRealNetworkMetrics(entityId) {
  // Renamed userId to entityId for clarity
  let uploadSpeed = null;
  let downloadSpeed = null;
  let latency = null;
  let packetLoss = null;
  let throughput = null;

  // 1. Get Download/Upload speeds (from cache or new test)
  const currentTime = Date.now();
  if (
    speedTestCache.data &&
    currentTime - speedTestCache.timestamp < speedTestCache.ttl
  ) {
    console.log(`Using cached speedtest data for ${entityId}`);
    const cached = speedTestCache.data;
    uploadSpeed = cached.uploadSpeed;
    downloadSpeed = cached.downloadSpeed;
  } else {
    console.log(`Running speedtest-cli for ${entityId}`);
    try {
      // Use speedtest-cli to get network speeds
      const { stdout: speedtestCliOut } = await execAsync(
        "speedtest-cli --json"
      );
      const speedData = JSON.parse(speedtestCliOut);

      if (speedData && speedData.download) {
        // speedtest-cli returns download/upload in bits/sec
        downloadSpeed = parseFloat((speedData.download / 1000000).toFixed(2)); // Convert to Mbps
      }
      if (speedData && speedData.upload) {
        uploadSpeed = parseFloat((speedData.upload / 1000000).toFixed(2)); // Convert to Mbps
      }

      speedTestCache.data = { downloadSpeed, uploadSpeed };
      speedTestCache.timestamp = currentTime;
      console.log(
        `Speedtest.net test for ${entityId} completed. Download: ${downloadSpeed} Mbps, Upload: ${uploadSpeed} Mbps`
      );
    } catch (err) {
      console.error(`speedtest-cli error for ${entityId}: ${err.message}`);
      speedTestCache.data = null;
      speedTestCache.timestamp = 0;
    }
  }
  throughput = downloadSpeed;

  // 2. Get Latency/Packet Loss using ping
  let pingTarget = "8.8.8.8"; // Default to public DNS (Google DNS)

  const device = devices.find((d) => d.id === entityId && d.ip);
  if (device) {
    pingTarget = device.ip;
    console.log(`Pinging device IP ${pingTarget} for ${entityId}`);
  } else {
    console.log(
      `Pinging public DNS ${pingTarget} for ${entityId} (entity not found in devices or no IP)`
    );
  }

  try {
    const os = require("os");
    let pingCommand;
    if (os.platform() === "win32") {
      // Windows: -n for count, -w for timeout in ms
      pingCommand = `ping -n 4 -w 5000 ${pingTarget}`;
    } else {
      // Unix: -c for count, -t for timeout in seconds
      pingCommand = `ping -c 4 -t 5 ${pingTarget}`;
    }
    const { stdout: pingOut, stderr: pingErr } = await execAsync(pingCommand);

    if (pingErr && pingErr.trim() !== "") {
      console.warn(`Ping stderr for ${pingTarget} (${entityId}): ${pingErr}`);
    }

    const latencyMatch = pingOut.match(
      /round-trip min\/avg\/max\/(?:stddev|mdev) = [\d.]+\/([\d.]+)\/[\d.]+\/[\d.]+ ms/
    );
    if (latencyMatch && latencyMatch[1]) {
      latency = parseFloat(latencyMatch[1]);
    } else {
      const rttMatch = pingOut.match(/time=([\d.]+) ms/);
      if (rttMatch && rttMatch[1]) {
        latency = parseFloat(rttMatch[1]);
        console.log(
          `Used fallback RTT for latency for ${pingTarget}: ${latency} ms`
        );
      } else {
        console.warn(
          `Could not parse average latency from ping output for ${pingTarget}:\n${pingOut}`
        );
      }
    }

    const lossMatch = pingOut.match(/([\d.]+)% packet loss/);
    if (lossMatch && lossMatch[1]) {
      packetLoss = parseFloat(lossMatch[1]);
    } else {
      console.warn(
        `Could not parse packet loss from ping output for ${pingTarget}:\n${pingOut}`
      );
    }
    console.log(
      `Ping to ${pingTarget} for ${entityId} completed. Latency: ${latency}, Packet Loss: ${packetLoss}`
    );
  } catch (err) {
    console.error(
      `Ping command error for ${pingTarget} (${entityId}): ${err.message}`
    );
    packetLoss = 100.0;
    latency = null;
    if (err.stdout) console.error(`Ping stdout on error: ${err.stdout}`);
    if (err.stderr) console.error(`Ping stderr on error: ${err.stderr}`);
  }

  return {
    uploadSpeed:
      uploadSpeed !== null ? parseFloat(uploadSpeed.toFixed(2)) : null,
    downloadSpeed:
      downloadSpeed !== null ? parseFloat(downloadSpeed.toFixed(2)) : null,
    packetLoss: packetLoss !== null ? parseFloat(packetLoss.toFixed(2)) : null,
    throughput: throughput !== null ? parseFloat(throughput.toFixed(2)) : null,
    latency: latency !== null ? parseFloat(latency.toFixed(2)) : null,
  };
}

// API endpoints

// Test connection speed between two connected users
app.post("/api/connections/:connectionId/test", async (req, res) => {
  const { connectionId } = req.params;

  // Find the connection
  const connection = connections.find((conn) => conn.id === connectionId);
  if (!connection) {
    return res.status(404).json({ error: "Connection not found" });
  }

  try {
    // Get metrics for both users in the connection
    const sourceMetrics = await getRealNetworkMetrics(connection.sourceId);
    const targetMetrics = await getRealNetworkMetrics(connection.targetId);

    // Calculate connection quality between the two users
    const connectionMetrics = {
      // Average of both users' metrics
      uploadSpeed:
        ((parseFloat(sourceMetrics.uploadSpeed) || 0) +
          (parseFloat(targetMetrics.uploadSpeed) || 0)) /
        2,
      downloadSpeed:
        ((parseFloat(sourceMetrics.downloadSpeed) || 0) +
          (parseFloat(targetMetrics.downloadSpeed) || 0)) /
        2,
      latency:
        ((parseFloat(sourceMetrics.latency) || 0) +
          (parseFloat(targetMetrics.latency) || 0)) /
        2,
      packetLoss:
        ((parseFloat(sourceMetrics.packetLoss) || 0) +
          (parseFloat(targetMetrics.packetLoss) || 0)) /
        2,
      throughput:
        ((parseFloat(sourceMetrics.throughput) || 0) +
          (parseFloat(targetMetrics.throughput) || 0)) /
        2,
      // Add timestamp for the test
      timestamp: new Date().toISOString(),
    };

    // Update the connection with the test results
    connection.lastTest = connectionMetrics;

    // Notify clients about the updated connection
    io.emit("connection-update", connections);

    res.json(connectionMetrics);
  } catch (e) {
    console.error("Connection test error:", e);
    res.status(500).json({ error: "Failed to test connection" });
  }
});

app.post("/api/scan", (req, res) => {
  // Use arp-scan to get actual network devices
  const os = require("os");
  let arpCommand;
  if (os.platform() === "win32") {
    arpCommand = "arp -a";
  } else {
    arpCommand = "arp -a";
  }
  exec(arpCommand, (error, stdout) => {
    if (error) {
      console.error("Scan error:", error);
      return res.status(500).json({ error: "Scan failed" });
    }
    // Parse arp -a output
    const newDevices = parseArpOutput(stdout);
    // Remove duplicates from global devices array by IP
    for (const device of newDevices) {
      // console.log(newDevices);
      const existingIdx = devices.findIndex((d) => d.name === device.name);
      if (existingIdx === -1) {
        devices.push(device);
      } else {
        // Optionally update the device info if needed
        // devices[existingIdx] = { ...devices[existingIdx], ...device };
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

// Device-specific network metrics endpoint
app.get("/api/devices/:deviceId/metrics", async (req, res) => {
  const { deviceId } = req.params;
  try {
    const metrics = await getRealNetworkMetrics(deviceId);
    res.json(metrics);
  } catch (e) {
    res.status(500).json({ error: "Failed to get device metrics" });
  }
});

app.get("/api/users", async (req, res) => {
  // Attach real network metrics to each user
  const usersWithMetrics = await Promise.all(
    users.map(async (u) => {
      let metrics = null;
      try {
        metrics = await getRealNetworkMetrics(u.id);
      } catch (e) {
        metrics = {
          uploadSpeed: null,
          downloadSpeed: null,
          packetLoss: null,
          throughput: null,
          latency: null,
        };
      }
      return {
        ...u,
        networkMetrics: metrics,
      };
    })
  );
  res.json(usersWithMetrics);
});

app.post("/api/connect", (req, res) => {
  const { userId, connectionType } = req.body;
  const sourceId = req.body.sourceId || "user-1"; // Default for demo

  // Helper to get user network information (IP address and connection type)
  function getUserNetworkInfo(userId) {
    const user = users.find((u) => u.id === userId);
    if (!user) return null;

    // Check if user has a device associated with them
    const userDevice = devices.find((d) => d.id === userId);

    // If user has a device, use its IP address
    const ipAddress = userDevice ? userDevice.ip : null;

    // Extract subnet from IP (e.g., 192.168.1.x -> 192.168.1)
    const subnet = ipAddress
      ? ipAddress.split(".").slice(0, 3).join(".")
      : null;

    // Check if connection is via ethernet
    const isEthernet = userDevice ? userDevice.isEthernet === true : false;

    return {
      subnet,
      ipAddress,
      isEthernet,
      // Keep the original network property for backward compatibility
      network: user.network || null,
    };
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

  // LAN connections: only allow if both users are on the same network (same subnet) or connected via ethernet
  if (connectionType === "LAN") {
    const sourceNetworkInfo = getUserNetworkInfo(sourceId);
    const targetNetworkInfo = getUserNetworkInfo(userId);

    // Check if we have network information for both users
    if (!sourceNetworkInfo || !targetNetworkInfo) {
      return res.status(400).json({
        error: "Cannot determine network information for one or both users",
      });
    }

    // Check if users are on the same subnet
    const sameSubnet =
      sourceNetworkInfo.subnet &&
      targetNetworkInfo.subnet &&
      sourceNetworkInfo.subnet === targetNetworkInfo.subnet;

    // Check if both users are connected via ethernet
    const bothEthernet =
      sourceNetworkInfo.isEthernet && targetNetworkInfo.isEthernet;

    // Check if users have the same network property (backward compatibility)
    const sameNetworkProperty =
      sourceNetworkInfo.network &&
      targetNetworkInfo.network &&
      sourceNetworkInfo.network === targetNetworkInfo.network;

    // Allow LAN connection only if users are on the same subnet OR both connected via ethernet
    // The sameNetworkProperty check is kept for backward compatibility but the primary logic is sameSubnet OR bothEthernet
    if (!(sameSubnet || bothEthernet) && !sameNetworkProperty) {
      return res.status(400).json({
        error:
          "LAN connections are only allowed between users on the same subnet or if both are connected via Ethernet.",
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
    console.log("User Data: ", userData);
    // Use a unique identifier for the user (e.g., userData.id or userData.name)
    if (userData && !userData.name) return;
    let userId = userData.id || `user-${Date.now()}`;
    // Check if a user with the same name or id is already connected (regardless of device name)
    let existingUser = users.find((u) => u.name === userData.name);
    let user;
    console.log(existingUser);
    if (existingUser) {
      // Prevent duplicate user registration (even if device name is different)
      user = { ...existingUser, status: "online" };
      // Update user in users array
      const idx = users.findIndex((u) => u.name === user.name);
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

// Add this function to parse arp -a output
function parseArpOutput(output) {
  const os = require("os");
  const lines = output.split(os.platform() === "win32" ? "\r\n" : "\n");
  const newDevices = [];
  for (const line of lines) {
    // Example: divines-mbp (192.168.1.173) at a4:83:e7:68:e2:30 on en0 ifscope permanent [ethernet]
    // Example router: MyRouterSSID (192.168.1.1) at 00:1a:2b:3c:4d:5e on en0 ifscope [ethernet]
    // Updated regex to capture interface and check for [ethernet]
    const ethMatch = line.match(
      /^([\w\-]+(?:\.[\w\-]+)*) \(([0-9.]+)\) at ([0-9a-f:]+) on (\w+) ifscope(?: \w+)? \[ethernet\]/i
    );
    const generalMatch = line.match(
      /^([\w\-]+(?:\.[\w\-]+)*) \(([0-9.]+)\) at ([0-9a-f:]+)/i // Fallback for non-ethernet or different formats
    );

    const match = ethMatch || generalMatch;

    if (match) {
      const hostnameOrSSID = match[1];
      const ip = match[2];
      const mac = match[3];
      const isEthernet = ethMatch ? true : false; // Check if it was the ethernet-specific match

      let type = "computer"; // Default type
      let name = hostnameOrSSID;

      // OS detection (simplified)
      const osNameMatch = hostnameOrSSID.match(
        /(iphone|android|windows|macbook|mac|ipad|linux|ubuntu|pixel|galaxy|samsung|xiaomi|huawei|oneplus|surface)/i
      );
      if (osNameMatch) {
        name = osNameMatch[0]; // Use detected OS name
      }

      // Device type heuristics
      if (ip.endsWith(".1")) {
        // Simplified router detection
        type = "router";
        name = hostnameOrSSID; // SSID for router
      } else if (isEthernet) {
        type = "computer"; // Assume wired connections are computers/servers unless other heuristics apply
      } else if (
        mac.toLowerCase().startsWith("a8:") || // Common MAC prefixes for smartphones
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
          isEthernet, // Store ethernet status
          status: "online",
        });
      }
    }
  }
  return newDevices;
}

// Start server
const PORT = process.env.PORT || 3003;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});