import axios from "axios";
import { Device, User, Connection } from "../types";

// API Service - these connect to real backend endpoints
// Base API URL - points to your backend
const API_URL = import.meta.env.VITE_API_URL || "http://192.168.0.173:3003/api";

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Network scanning
export const scanNetwork = () => {
  return api.post<Device[]>("/scan");
};

// Get all devices
export const getDevices = () => {
  return api.get<Device[]>("/devices");
};

// Get all users
export const getUsers = () => {
  return api.get<User[]>("/users");
};

// Connect to a user
export const connectToUser = (
  userId: string,
  connectionType: string,
  sourceId?: string
) => {
  return api.post<Connection>("/connect", {
    userId,
    connectionType,
    sourceId,
  });
};

// Disconnect from a user
export const disconnectFromUser = (connectionId: string) => {
  return api.delete(`/connections/${connectionId}`);
};

// Get device network metrics
export const getDeviceMetrics = (deviceId: string) => {
  return api.get(`/devices/${deviceId}/metrics`);
};

// Get device bandwidth information
export const getDeviceBandwidth = (deviceId: string) => {
  return api.get(`/devices/${deviceId}/bandwidth`);
};

// Test device connection speed (similar to fast.com)
export const testConnectionSpeed = (deviceId: string) => {
  return api.post(`/devices/${deviceId}/speedtest`);
};

// Test connection speed between two connected users
export const testConnectionBetweenUsers = (connectionId: string) => {
  return api.post<{
    uploadSpeed: number;
    downloadSpeed: number;
    latency: number;
    packetLoss: number;
    throughput: number;
    timestamp: string;
  }>(`/connections/${connectionId}/test`);
};
