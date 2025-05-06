import { Device, User, Connection } from '../types';

// Mock data for demonstration purposes
export const mockDevices: Device[] = [
  {
    id: 'device-1',
    name: 'Router',
    ip: '192.168.1.1',
    mac: '00:1A:2B:3C:4D:5E',
    type: 'router',
    status: 'online'
  },
  {
    id: 'device-2',
    name: 'Desktop PC',
    ip: '192.168.1.10',
    mac: '00:1A:2B:3C:4D:6F',
    type: 'computer',
    status: 'online'
  },
  {
    id: 'device-3',
    name: 'Laptop',
    ip: '192.168.1.15',
    mac: '00:1A:2B:3C:4D:7G',
    type: 'computer',
    status: 'online'
  },
  {
    id: 'device-4',
    name: 'Smartphone',
    ip: '192.168.1.20',
    mac: '00:1A:2B:3C:4D:8H',
    type: 'smartphone',
    status: 'online'
  }
];

export const mockUsers: User[] = [
  {
    id: 'user-1',
    name: 'Current User',
    status: 'online'
  },
  {
    id: 'user-2',
    name: 'Alice Smith',
    status: 'online'
  },
  {
    id: 'user-3',
    name: 'Bob Johnson',
    status: 'away'
  },
  {
    id: 'user-4',
    name: 'Carol Williams',
    status: 'offline'
  }
];

export const mockConnections: Connection[] = [
  {
    id: 'conn-1',
    sourceId: 'user-1',
    targetId: 'device-1',
    type: 'WLAN',
    status: 'active',
    established: new Date().toISOString()
  },
  {
    id: 'conn-2',
    sourceId: 'user-2',
    targetId: 'device-1',
    type: 'LAN',
    status: 'active',
    established: new Date().toISOString()
  },
  {
    id: 'conn-3',
    sourceId: 'user-1',
    targetId: 'user-2',
    type: 'P2P',
    status: 'active',
    established: new Date().toISOString()
  }
];