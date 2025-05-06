# Network Visualization Application

This application provides a real-time network visualization tool that scans for devices on your local network and visualizes them in an interactive graph. It also supports user-to-user connections with different connection types (P2P, LAN, WLAN).

## Features

- Real-time network scanning to detect connected devices
- Interactive network graph visualization using Vis.js
- User-to-user connection functionality
- Educational content about networking concepts
- Dark/light mode toggle
- Responsive design for all device sizes

## Getting Started

### Prerequisites

- Node.js (v16+)
- npm (v7+)

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Start the frontend development server:

```bash
npm run dev
```

4. Start the backend server (in a separate terminal):

```bash
npm run server
```

## Project Structure

- `/src` - Frontend React application
  - `/components` - React components
  - `/context` - React context providers
  - `/services` - API and socket services
  - `/types` - TypeScript type definitions
  - `/utils` - Utility functions and mock data
- `/server` - Backend Express server

## Educational Content

The application includes educational content about various networking concepts:

- Peer-to-Peer (P2P) connections
- Local Area Network (LAN)
- Wireless Local Area Network (WLAN)
- Network routers and infrastructure
- Device connections and network topology

## Technologies Used

- Frontend:
  - React with TypeScript
  - Tailwind CSS for styling
  - Vis.js for network visualization
  - Socket.IO client for real-time updates
  - Lucide React for icons

- Backend:
  - Node.js with Express
  - Socket.IO for WebSocket communication
  - Network scanning utilities (simulation only in this version)

## License

This project is licensed under the MIT License.