const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const { exec } = require('child_process');

// Create Express app
const app = express();
app.use(cors());
app.use(express.json());

// Create HTTP server
const server = http.createServer(app);

// Create Socket.IO server
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// In-memory storage for demonstration
const devices = [];
const users = [];
const connections = [];

// API endpoints
app.post('/api/scan', (req, res) => {
  // Use arp-scan to get actual network devices
  exec('arp -a', (error, stdout) => {
    if (error) {
      console.error('Scan error:', error);
      return res.status(500).json({ error: 'Scan failed' });
    }
    
    const newDevices = parseArpOutput(stdout);
    devices.push(...newDevices);
    
    // Notify all clients
    io.emit('device-update', newDevices);
    
    res.json(newDevices);
  });
});

app.get('/api/devices', (req, res) => {
  res.json(devices);
});

app.get('/api/users', (req, res) => {
  res.json(users);
});

app.post('/api/connect', (req, res) => {
  const { userId, connectionType } = req.body;
  const sourceId = req.body.sourceId || 'user-1'; // Default for demo
  
  // Create new connection
  const newConnection = {
    id: `conn-${Date.now()}`,
    sourceId,
    targetId: userId,
    type: connectionType,
    status: 'active',
    established: new Date().toISOString()
  };
  
  connections.push(newConnection);
  
  // Notify all clients
  io.emit('connection-update', connections);
  
  res.json(newConnection);
});

app.delete('/api/connections/:id', (req, res) => {
  const { id } = req.params;
  
  // Remove connection
  const index = connections.findIndex(conn => conn.id === id);
  if (index !== -1) {
    connections.splice(index, 1);
    
    // Notify all clients
    io.emit('connection-update', connections);
    
    res.status(200).json({ success: true });
  } else {
    res.status(404).json({ error: 'Connection not found' });
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('New client connected');
  
  // Send current data to newly connected client
  socket.emit('device-update', devices);
  socket.emit('user-update', users);
  socket.emit('connection-update', connections);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Utility functions
function simulateDevices() {
  const numDevices = Math.floor(Math.random() * 3) + 1; // 1-3 devices
  const newDevices = [];
  
  for (let i = 0; i < numDevices; i++) {
    const deviceTypes = ['computer', 'router', 'smartphone'];
    const type = deviceTypes[Math.floor(Math.random() * deviceTypes.length)];
    
    newDevices.push({
      id: `device-${Date.now()}-${i}`,
      name: `${type}-${Math.floor(Math.random() * 100)}`,
      ip: `192.168.1.${Math.floor(Math.random() * 255)}`,
      mac: `00:1A:2B:${Math.floor(Math.random() * 100)}:${Math.floor(Math.random() * 100)}:${Math.floor(Math.random() * 100)}`,
      type,
      status: 'online'
    });
  }
  
  return newDevices;
}

// Add this function to parse arp -a output
function parseArpOutput(output) {
  const lines = output.split('\n');
  const devices = [];
  
  for (const line of lines) {
    // Match IP and MAC addresses in arp output
    // Format varies by OS, but this should work for macOS
    const match = line.match(/\(([0-9.]+)\) at ([0-9a-f:]+)/i);
    
    if (match) {
      const ip = match[1];
      const mac = match[2];
      
      // Try to determine device type based on MAC prefix or IP pattern
      let type = 'computer';
      
      // Simple heuristic for device type (can be improved)
      if (ip.startsWith('192.168.1.1') || ip.startsWith('10.0.0.1')) {
        type = 'router';
      } else if (mac.toLowerCase().startsWith('a8:') || 
                mac.toLowerCase().startsWith('ac:')) {
        type = 'smartphone';
      }
      
      devices.push({
        id: `device-${Date.now()}-${devices.length}`,
        name: `Device-${devices.length + 1}`,
        ip,
        mac,
        type,
        status: 'online'
      });
    }
  }
  
  return devices;
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