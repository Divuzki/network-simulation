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
  network:
    "A network is a collection of computers, servers, and other devices that are connected together to share resources and communicate. This application helps you visualize and understand network topologies.",
  topology:
    "Network topology refers to the arrangement of elements in a network. Common topologies include star, mesh, bus, and ring. This application allows you to visualize different network topologies.",
  connection:
    "Connections represent how devices communicate with each other. In this application, you can create different types of connections like LAN or P2P between devices.",
  p2p: "P2P (Peer-to-Peer) is a network model where computers can communicate directly without a central server. In this application, P2P connections are limited to 1-to-1 connections.",
  lan: "LAN (Local Area Network) connects computers in a limited area like a home, office, or building. In this application, LAN connections require devices to be on the same subnet or both connected via Ethernet.",
  scan: "The scan feature discovers devices on your local network. Click the 'Scan Network' button to find devices connected to your network.",
  metrics:
    "Network metrics include upload/download speed, latency, packet loss, and throughput. These metrics help you understand the performance of your network connections.",
    wan: "WAN (Wide Area Network) connects networks that are geographically far away. This application supports visualization of WAN connections.",
  default:
    "I'm a simple network assistant. I can help with basic network concepts and how to use this application. Try asking about network topology, connections, or specific features.",
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
    console.log(`Running speedtest for ${entityId}`);
    try {
      const os = require("os");
      let speedtestCommand;
      
      // Try different speedtest commands based on platform
      if (os.platform() === "win32") {
        // On Windows, try speedtest.exe (official Ookla CLI) first, then speedtest-cli
        try {
          const { stdout: speedtestOut } = await execAsync("speedtest --format=json");
          const speedData = JSON.parse(speedtestOut);
          
          if (speedData && speedData.download && speedData.download.bandwidth) {
            // Official Ookla CLI returns bandwidth in bytes/sec
            downloadSpeed = parseFloat((speedData.download.bandwidth * 8 / 1000000).toFixed(2)); // Convert to Mbps
          }
          if (speedData && speedData.upload && speedData.upload.bandwidth) {
            uploadSpeed = parseFloat((speedData.upload.bandwidth * 8 / 1000000).toFixed(2)); // Convert to Mbps
          }
        } catch (ooklaErr) {
          console.log(`Official speedtest CLI not available, trying speedtest-cli: ${ooklaErr.message}`);
          // Fallback to speedtest-cli
          const { stdout: speedtestCliOut } = await execAsync("speedtest-cli --json");
          const speedData = JSON.parse(speedtestCliOut);
          
          if (speedData && speedData.download) {
            downloadSpeed = parseFloat((speedData.download / 1000000).toFixed(2)); // Convert to Mbps
          }
          if (speedData && speedData.upload) {
            uploadSpeed = parseFloat((speedData.upload / 1000000).toFixed(2)); // Convert to Mbps
          }
        }
      } else {
        // Unix/Linux/macOS: use speedtest-cli
        const { stdout: speedtestCliOut } = await execAsync("speedtest-cli --json");
        const speedData = JSON.parse(speedtestCliOut);
        
        if (speedData && speedData.download) {
          downloadSpeed = parseFloat((speedData.download / 1000000).toFixed(2)); // Convert to Mbps
        }
        if (speedData && speedData.upload) {
          uploadSpeed = parseFloat((speedData.upload / 1000000).toFixed(2)); // Convert to Mbps
        }
      }

      speedTestCache.data = { downloadSpeed, uploadSpeed };
      speedTestCache.timestamp = currentTime;
      console.log(
        `Speedtest for ${entityId} completed. Download: ${downloadSpeed} Mbps, Upload: ${uploadSpeed} Mbps`
      );
    } catch (err) {
      console.error(`Speedtest error for ${entityId}: ${err.message}`);
      console.log(`Note: Make sure speedtest CLI is installed. On Windows: 'winget install Ookla.Speedtest.CLI' or 'pip install speedtest-cli'`);
      speedTestCache.data = null;
      speedTestCache.timestamp = 0;
      // Set fallback values to indicate speedtest is not available
      downloadSpeed = null;
      uploadSpeed = null;
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

    // Parse latency based on OS
    if (os.platform() === "win32") {
      // Windows ping output: "Average = 23ms" or "Minimum = 1ms, Maximum = 4ms, Average = 2ms"
      const avgMatch = pingOut.match(/Average = ([\d.]+)ms/i);
      if (avgMatch && avgMatch[1]) {
        latency = parseFloat(avgMatch[1]);
      } else {
        // Fallback: look for individual time values
        const timeMatch = pingOut.match(/time[<=]([\d.]+)ms/i);
        if (timeMatch && timeMatch[1]) {
          latency = parseFloat(timeMatch[1]);
        }
      }
    } else {
      // Unix/Linux/macOS ping output
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
        }
      }
    }

    if (!latency) {
      console.warn(
        `Could not parse latency from ping output for ${pingTarget}:\n${pingOut}`
      );
    }

    // Parse packet loss based on OS
    if (os.platform() === "win32") {
      // Windows: "(25% loss)" or "Packets: Sent = 4, Received = 3, Lost = 1 (25% loss)"
      const lossMatch = pingOut.match(/\((\d+)% loss\)/i) || pingOut.match(/Lost = \d+ \((\d+)% loss\)/i);
      if (lossMatch && lossMatch[1]) {
        packetLoss = parseFloat(lossMatch[1]);
      }
    } else {
      // Unix/Linux/macOS: "25% packet loss"
      const lossMatch = pingOut.match(/([\d.]+)% packet loss/);
      if (lossMatch && lossMatch[1]) {
        packetLoss = parseFloat(lossMatch[1]);
      }
    }

    if (packetLoss === null) {
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

// Test connection speed between two connected devices
app.post("/api/connections/:connectionId/test", async (req, res) => {
  const { connectionId } = req.params;

  // Find the connection
  const connection = connections.find((conn) => conn.id === connectionId);
  if (!connection) {
    return res.status(404).json({ error: "Connection not found" });
  }

  try {
    // Get metrics for both devices in the connection
    const sourceMetrics = await getRealNetworkMetrics(connection.sourceId);
    const targetMetrics = await getRealNetworkMetrics(connection.targetId);

    // Calculate connection quality between the two devices
    const connectionMetrics = {
      // Average of both devices' metrics
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
    
    // Add connected website users as devices if they're not already detected
    const onlineUsers = users.filter(u => u.status === 'online');
    for (const user of onlineUsers) {
      // Check if this user is already in the scanned devices (by name)
      const existingDevice = newDevices.find(d => d.name === user.name);
      if (!existingDevice) {
        // Add the connected user as a device
        newDevices.push({
          id: `device-user-${user.id}`,
          name: user.name,
          ip: 'Connected to Website', // Placeholder since we don't have their IP
          mac: 'N/A',
          type: 'computer',
          isEthernet: false,
          status: 'online',
          isWebsiteUser: true // Flag to identify website-connected users
        });
      } else {
        // Mark existing device as a website user
        existingDevice.isWebsiteUser = true;
      }
    }
    
    // Remove duplicates from global devices array by name
    for (const device of newDevices) {
      const existingIdx = devices.findIndex((d) => d.name === device.name);
      if (existingIdx === -1) {
        devices.push(device);
      } else {
        // Update the device info, preserving website user flag
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
  // Attach real network metrics to each device (user represents a device connecting to the website)
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
  // res.json(usersWithMetrics);
  res.json(users);
});
console.log(users);

app.post("/api/connect", (req, res) => {
  const { userId, connectionType } = req.body;
  const sourceId = req.body.sourceId || "user-1"; // Default for demo

  // Helper to get device network information (IP address and connection type)
  function getUserNetworkInfo(userId) {
    const user = users.find((u) => u.id === userId);
    if (!user) return null;

    // Check if user (device) has a network device associated with them
    const userDevice = devices.find((d) => d.id === userId);

    // If user (device) has a network device, use its IP address
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
    // For P2P connections, check if either device already has a P2P connection
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

    // P2P connections are limited to 2 devices only (1-to-1)
    if (sourceP2PConnections.length > 0 || targetP2PConnections.length > 0) {
      return res
        .status(400)
        .json({ error: "P2P connections are limited to 2 devices only" });
    }
  }

  // LAN connections: only allow if both devices are on the same network (same subnet) or connected via ethernet
  if (connectionType === "LAN") {
    const sourceNetworkInfo = getUserNetworkInfo(sourceId);
    const targetNetworkInfo = getUserNetworkInfo(userId);

    // Check if we have network information for both devices
    if (!sourceNetworkInfo || !targetNetworkInfo) {
      return res.status(400).json({
        error: "Cannot determine network information for one or both devices",
      });
    }

    // Check if devices are on the same subnet
    const sameSubnet =
      sourceNetworkInfo.subnet &&
      targetNetworkInfo.subnet &&
      sourceNetworkInfo.subnet === targetNetworkInfo.subnet;

    // Check if both devices are connected via ethernet
    const bothEthernet =
      sourceNetworkInfo.isEthernet && targetNetworkInfo.isEthernet;

    // Check if devices have the same network property (backward compatibility)
    const sameNetworkProperty =
      sourceNetworkInfo.network &&
      targetNetworkInfo.network &&
      sourceNetworkInfo.network === targetNetworkInfo.network;

    // Allow LAN connection only if devices are on the same subnet OR both connected via ethernet
    // The sameNetworkProperty check is kept for backward compatibility but the primary logic is sameSubnet OR bothEthernet
    if (!(sameSubnet || bothEthernet) && !sameNetworkProperty) {
      return res.status(400).json({
        error:
          "LAN connections are only allowed between devices on the same subnet or if both are connected via Ethernet.",
      });
    }
  }

  // Check if connection already exists between these devices
  const existingConnection = connections.find(
    (conn) =>
      (conn.sourceId === sourceId && conn.targetId === userId) ||
      (conn.sourceId === userId && conn.targetId === sourceId)
  );

  if (existingConnection) {
    return res
      .status(400)
      .json({ error: "Connection already exists between these devices" });
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

  // Handle device registration (users represent devices connecting to the website)
  socket.on("register-user", (userData) => {
    console.log("Device Data: ", userData);
    // Use a unique identifier for the device
    let userId = userData.id || `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Check if this specific user ID is already connected (to handle reconnections)
    let existingUser = users.find((u) => u.id === userData.id && userData.id);
    let user;
    console.log("existingUser:", existingUser);
    
    if (existingUser) {
      // Handle reconnection - update existing user status
      user = { ...existingUser, status: "online" };
      const idx = users.findIndex((u) => u.id === user.id);
      users[idx] = user;
      userId = user.id;
    } else {
      // Add new device - each connection gets a unique entry
      user = {
        id: userId,
        name: userData.name || `Device-${users.length + 1}`,
        status: "online",
      };
      users.push(user);
    }
    
    // Add the user to devices array - each user gets a unique device entry
    const existingDevice = devices.find(d => d.id === `device-user-${user.id}`);
    if (!existingDevice) {
      const newDevice = {
        id: `device-user-${user.id}`,
        name: user.name,
        ip: 'Connected to Website',
        mac: 'N/A',
        type: 'computer',
        isEthernet: false,
        status: 'online',
        isWebsiteUser: true
      };
      devices.push(newDevice);
      // Notify all clients about the new device
      io.emit("device-update", [newDevice]);
    } else {
      // Update existing device status for reconnection
      existingDevice.status = 'online';
      existingDevice.isWebsiteUser = true;
    }
    
    // Map socket to userId (device ID)
    socketUserMap.set(socket.id, userId);
    // Acknowledge registration with device data
    socket.emit("user-registered", user);
    // Notify all clients about updated device list
    io.emit("user-update", users);
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    const userId = socketUserMap.get(socket.id);
    if (userId) {
      // Mark device as offline
      const userIdx = users.findIndex((u) => u.id === userId);
      if (userIdx !== -1) {
        users[userIdx].status = "offline";
        
        // Remove the corresponding device from devices array
        const deviceIdx = devices.findIndex((d) => d.id === `device-user-${userId}`);
        if (deviceIdx !== -1) {
          devices.splice(deviceIdx, 1);
        }
      }
      // Remove mapping
      socketUserMap.delete(socket.id);
    }
    // If no devices are online, clear all memory
    const onlineUsers = users.filter((u) => u.status === "online");
    if (onlineUsers.length === 0) {
      users.length = 0;
      connections.length = 0;
      devices.length = 0;
      socketUserMap.clear();
      console.log("All devices disconnected. Memory cleared.");
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
    let match = null;
    let ip = null;
    let mac = null;
    let hostnameOrSSID = null;
    let isEthernet = false;
    
    if (os.platform() === "win32") {
      // Windows ARP output format:
      // Interface: 192.168.1.173 --- 0x4
      //   Internet Address      Physical Address      Type
      //   192.168.1.1           00-1a-2b-3c-4d-5e     dynamic
      //   192.168.1.100         a4-83-e7-68-e2-30     dynamic
      
      // Skip header lines
      if (line.includes("Interface:") || line.includes("Internet Address") || line.includes("---") || line.trim() === "") {
        continue;
      }
      
      // Match Windows ARP format: IP address followed by MAC address
      const winMatch = line.match(/^\s*([0-9.]+)\s+([0-9a-f-]+)\s+(\w+)/i);
      if (winMatch) {
        ip = winMatch[1];
        mac = winMatch[2].replace(/-/g, ":"); // Convert Windows MAC format (xx-xx-xx) to standard (xx:xx:xx)
        const type = winMatch[3];
        
        // Try to resolve hostname (simplified - in real implementation you might want to do reverse DNS)
        hostnameOrSSID = `Device-${ip.split('.').pop()}`; // Use last octet as simple identifier
        
        // Windows doesn't easily show ethernet vs wifi in ARP, so we'll assume dynamic entries could be either
        isEthernet = false; // Default to false since we can't easily determine this from Windows ARP
        
        match = { ip, mac, hostnameOrSSID, isEthernet };
      }
    } else {
      // Unix/macOS ARP output format:
      // Example: divines-mbp (192.168.1.173) at a4:83:e7:68:e2:30 on en0 ifscope permanent [ethernet]
      // Example router: MyRouterSSID (192.168.1.1) at 00:1a:2b:3c:4d:5e on en0 ifscope [ethernet]
      
      const ethMatch = line.match(
        /^([\w\-]+(?:\.[\w\-]+)*) \(([0-9.]+)\) at ([0-9a-f:]+) on (\w+) ifscope(?: \w+)? \[ethernet\]/i
      );
      const generalMatch = line.match(
        /^([\w\-]+(?:\.[\w\-]+)*) \(([0-9.]+)\) at ([0-9a-f:]+)/i
      );
      
      const unixMatch = ethMatch || generalMatch;
      if (unixMatch) {
        hostnameOrSSID = unixMatch[1];
        ip = unixMatch[2];
        mac = unixMatch[3];
        isEthernet = ethMatch ? true : false;
        
        match = { ip, mac, hostnameOrSSID, isEthernet };
      }
    }

    if (match) {
      let type = "computer"; // Default type
      let name = match.hostnameOrSSID;

      // OS detection (simplified)
      const osNameMatch = match.hostnameOrSSID.match(
        /(iphone|android|windows|macbook|mac|ipad|linux|ubuntu|pixel|galaxy|samsung|xiaomi|huawei|oneplus|surface)/i
      );
      if (osNameMatch) {
        name = osNameMatch[0]; // Use detected OS name
      }

      // Device type heuristics
      if (match.ip.endsWith(".1")) {
        // Simplified router detection
        type = "router";
        name = match.hostnameOrSSID; // SSID for router
      } else if (match.isEthernet) {
        type = "computer"; // Assume wired connections are computers/servers unless other heuristics apply
      } else if (
        match.mac.toLowerCase().startsWith("a8:") || // Common MAC prefixes for smartphones
        match.mac.toLowerCase().startsWith("ac:")
      ) {
        type = "smartphone";
      }

      // Avoid duplicates by IP address
      if (!newDevices.some((d) => d.ip === match.ip)) {
        newDevices.push({
          id: `device-${Date.now()}-${newDevices.length}`,
          name,
          ip: match.ip,
          mac: match.mac,
          type,
          isEthernet: match.isEthernet,
          status: "online",
        });
      }
    }
  }
  return newDevices;
}

// Start server
const PORT = process.env.PORT || 3003;
const HOST = process.env.HOST || "0.0.0.0"; // Bind to all interfaces by default

server.listen(PORT, HOST, () => {
  console.log(`Server running on ${HOST}:${PORT}`);
  console.log(`Platform: ${require('os').platform()}`);
  console.log(`Access the application at: http://localhost:${PORT}`);
});
