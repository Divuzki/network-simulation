const request = require('supertest');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Import server app
const app = require('../index.cjs');

describe('Network Visualization Server Tests', () => {
  describe('Network Detection', () => {
    test('GET /api/devices should return connected devices', async () => {
      const response = await request(app).get('/api/devices');
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    test('POST /api/scan should detect network devices', async () => {
      const response = await request(app).post('/api/scan');
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      
      // Check if devices have required properties
      if (response.body.length > 0) {
        const device = response.body[0];
        expect(device).toHaveProperty('id');
        expect(device).toHaveProperty('name');
        expect(device).toHaveProperty('ip');
        expect(device).toHaveProperty('mac');
        expect(device).toHaveProperty('type');
        expect(device).toHaveProperty('isEthernet');
      }
    });
  });

  describe('Device Connections', () => {
    test('POST /api/connect should allow LAN connections for devices on same network', async () => {
      const response = await request(app)
        .post('/api/connect')
        .send({
          userId: 'user-2',
          sourceId: 'user-1',
          connectionType: 'LAN'
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
      expect(response.body.type).toBe('LAN');
    });

    test('POST /api/connect should allow WAN connections through WLAN', async () => {
      const response = await request(app)
        .post('/api/connect')
        .send({
          userId: 'user-3',
          sourceId: 'user-1',
          connectionType: 'WAN'
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
      expect(response.body.type).toBe('WAN');
    });

    test('POST /api/connect should prevent multiple P2P connections', async () => {
      // First P2P connection should succeed
      const response1 = await request(app)
        .post('/api/connect')
        .send({
          userId: 'user-2',
          sourceId: 'user-1',
          connectionType: 'P2P'
        });
      
      expect(response1.status).toBe(200);

      // Second P2P connection should fail
      const response2 = await request(app)
        .post('/api/connect')
        .send({
          userId: 'user-3',
          sourceId: 'user-1',
          connectionType: 'P2P'
        });
      
      expect(response2.status).toBe(400);
    });
  });

  describe('Network Metrics', () => {
    test('GET /api/devices/:deviceId/metrics should return network metrics', async () => {
      const response = await request(app).get('/api/devices/device-1/metrics');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('uploadSpeed');
      expect(response.body).toHaveProperty('downloadSpeed');
      expect(response.body).toHaveProperty('latency');
      expect(response.body).toHaveProperty('packetLoss');
    });

    test('POST /api/connections/:connectionId/test should test connection speed', async () => {
      const response = await request(app).post('/api/connections/conn-1/test');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('uploadSpeed');
      expect(response.body).toHaveProperty('downloadSpeed');
      expect(response.body).toHaveProperty('latency');
      expect(response.body).toHaveProperty('timestamp');
    });
  });
});