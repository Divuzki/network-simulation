const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const { exec } = require("child_process");
const os = require("os");

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

// Simple chatbot responses
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

// Network interface detection
function getNetworkInterfaces() {
  const interfaces = os.networkInterfaces();
  const networkInfo = [];

  for (const [name, addrs] of Object.entries(interfaces)) {
    for (const addr of addrs) {
      if (addr.family === 'IPv4' && !addr.internal) {
        networkInfo.push({
          name,
          address: addr.address,
          netmask: addr.netmask,
          mac: addr.mac,
          isEthernet: name.toLowerCase().includes('eth') || name.toLowerCase().includes('ethernet')
        });
      }
    }
  }

  return networkInfo;
}

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

// Network scanning function
async function scanLocalNetwork() {
  const networkInfo = getNetworkInterfaces();
  const discoveredDevices = [];

  for (const network of networkInfo) {
    try {
      // Use arp-scan or similar tool to discover devices
      const command = network.isEthernet ? 
        `arp-scan --interface=${network.name} --localnet` :
        `arp -a`;
      
      const { stdout } = await execAsync(command);
      const devices = parseArpOutput(stdout, network.isEthernet);
      discoveredDevices.push(...devices);
    } catch (error) {
      console.error(`Error scanning network ${network.name}:`, error);
    }
  }

  return discoveredDevices;
}

// API endpoints
app.post("/api/scan", async (req, res) => {
  try {
    const newDevices = await scanLocalNetwork();
    
    // Update devices list
    for (const device of newDevices) {
      const existingIdx = devices.findIndex(d => d.ip === device.ip);
      if (existingIdx === -1) {
        devices.push(device);
      } else {
        devices[existingIdx] = { ...devices[existingIdx], ...device };
      }
    }

    // Notify all clients
    io.emit("device-update", devices);
    res.json(devices);
  } catch (error) {
    console.error("Scan error:", error);
    res.status(500).json({ error: "Network scan failed" });
  }
});

app.get("/api/devices", (req, res) => {
  res.json(devices);
});

// Connect users based on network type
app.post("/api/connect", (req, res) => {
  const { userId, connectionType, sourceId } = req.body;

  // Get network information for both users
  const sourceDevice = devices.find(d => d.id === sourceId);
  const targetDevice = devices.find(d => d.id === userId);

  if (!sourceDevice || !targetDevice) {
    return res.status(400).json({ error: "One or both users not found" });
  }

  // Check connection type rules
  if (connectionType === "P2P") {
    const existingP2P = connections.find(c => 
      (c.sourceId === sourceId || c.targetId === sourceId || 
       c.sourceId === userId || c.targetId === userId) && 
      c.type === "P2P"
    );

    if (existingP2P) {
      return res.status(400).json({ error: "P2P connections are limited to 1-to-1" });
    }
  } else if (connectionType === "LAN") {
    const sameSubnet = sourceDevice.subnet === targetDevice.subnet;
    const bothEthernet = sourceDevice.isEthernet && targetDevice.isEthernet;

    if (!sameSubnet && !bothEthernet) {
      return res.status(400).json({ error: "LAN connections require same subnet or ethernet connection" });
    }
  } else if (connectionType === "WAN") {
    // Allow WAN connections through WLAN
    if (!sourceDevice.isWlan && !targetDevice.isWlan) {
      return res.status(400).json({ error: "WAN connections require WLAN capability" });
    }
  }

  // Create connection
  const connection = {
    id: `conn-${Date.now()}`,
    sourceId,
    targetId: userId,
    type: connectionType,
    status: "active",
    established: new Date().toISOString()
  };

  connections.push(connection);
  io.emit("connection-update", connections);
  res.json(connection);
});

// Parse arp output with enhanced device detection
function parseArpOutput(output, isEthernet) {
  const lines = output.split('\n');
  const devices = [];
  const ipRegex = /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/;
  const macRegex = /([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})/;

  for (const line of lines) {
    const ipMatch = line.match(ipRegex);
    const macMatch = line.match(macRegex);

    if (ipMatch && macMatch) {
      const ip = ipMatch[1];
      const mac = macMatch[0];
      const subnet = ip.split('.').slice(0, 3).join('.');
      
      // Determine device type
      let type = 'computer';
      let isWlan = false;

      if (ip.endsWith('.1')) {
        type = 'router';
      } else if (mac.toLowerCase().startsWith('a8:') || mac.toLowerCase().startsWith('ac:')) {
        type = 'smartphone';
        isWlan = true;
      }

      devices.push({
        id: `device-${Date.now()}-${devices.length}`,
        name: `Device-${devices.length + 1}`,
        ip,
        mac,
        type,
        subnet,
        isEthernet,
        isWlan,
        status: 'online'
      });
    }
  }

  return devices;
}

// Start server
const PORT = process.env.PORT || 3003;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;