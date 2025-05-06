import React, { useEffect, useRef, useState } from 'react';
import { Network } from 'vis-network';
import { DataSet } from 'vis-data';
import { useNetwork } from '../context/NetworkContext';
import { getNodeOptions, getEdgeOptions } from '../utils/networkOptions';

interface NetworkGraphProps {
  onEducationClick: (topic: string) => void;
}

const NetworkGraph: React.FC<NetworkGraphProps> = ({ onEducationClick }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<Network | null>(null);
  const { devices, users, connections } = useNetwork();
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  useEffect(() => {
    // Only create the network if the container exists
    if (!containerRef.current) return;

    // Create nodes for devices and users
    const nodes = new DataSet(
      [...devices.map(device => ({
        id: device.id,
        label: device.name,
        group: device.type,
        title: `${device.name} (${device.ip})`,
      })),
      ...users.map(user => ({
        id: user.id,
        label: user.name,
        group: 'user',
        title: user.name,
      }))]
    );

    // Create edges for connections
    const edges = new DataSet(
      connections.map(connection => ({
        id: connection.id,
        from: connection.sourceId,
        to: connection.targetId,
        label: connection.type,
        dashes: connection.type !== 'P2P',
        color: {
          color: connection.type === 'P2P' ? '#10B981' : 
                 connection.type === 'LAN' ? '#3B82F6' : '#8B5CF6',
          highlight: connection.type === 'P2P' ? '#059669' : 
                      connection.type === 'LAN' ? '#2563EB' : '#7C3AED',
        },
        title: `${connection.type} connection established ${new Date(connection.established).toLocaleString()}`
      }))
    );

    // Create the network
    const network = new Network(
      containerRef.current, 
      { nodes, edges }, 
      {
        nodes: getNodeOptions(),
        edges: getEdgeOptions(),
        physics: {
          enabled: true,
          barnesHut: {
            gravitationalConstant: -2000,
            centralGravity: 0.3,
            springLength: 150,
            springConstant: 0.04,
          },
          stabilization: {
            iterations: 1000,
          },
        },
        interaction: {
          hover: true,
          tooltipDelay: 200,
          hideEdgesOnDrag: true,
          navigationButtons: true,
        },
      }
    );

    // Event listeners
    network.on('click', (params) => {
      if (params.nodes.length > 0) {
        const nodeId = params.nodes[0];
        const node = nodes.get(nodeId);
        
        if (node) {
          // Check if it's a device or user
          const device = devices.find(d => d.id === nodeId);
          const user = users.find(u => u.id === nodeId);
          
          if (device) {
            onEducationClick(device.type);
          } else if (user) {
            onEducationClick('user-connection');
          }
        }
      } else if (params.edges.length > 0) {
        const edgeId = params.edges[0];
        const edge = edges.get(edgeId);
        
        if (edge) {
          onEducationClick(edge.label.toLowerCase());
        }
      }
    });

    network.on('hoverNode', (params) => {
      setHoveredNode(params.node);
    });

    network.on('blurNode', () => {
      setHoveredNode(null);
    });

    // Save the network instance
    networkRef.current = network;

    // Cleanup function
    return () => {
      if (networkRef.current) {
        networkRef.current.destroy();
      }
    };
  }, [devices, users, connections, onEducationClick]);

  // Update the network when data changes
  useEffect(() => {
    if (!networkRef.current) return;
    
    const network = networkRef.current;
    
    // Update nodes and edges when data changes
    const nodes = network.body.data.nodes;
    const edges = network.body.data.edges;
    
    // Update nodes
    const currentNodeIds = new Set(nodes.getIds());
    
    // Add new devices
    devices.forEach(device => {
      if (!currentNodeIds.has(device.id)) {
        nodes.add({
          id: device.id,
          label: device.name,
          group: device.type,
          title: `${device.name} (${device.ip})`,
        });
      }
    });
    
    // Add new users
    users.forEach(user => {
      if (!currentNodeIds.has(user.id)) {
        nodes.add({
          id: user.id,
          label: user.name,
          group: 'user',
          title: user.name,
        });
      }
    });
    
    // Update edges
    const currentEdgeIds = new Set(edges.getIds());
    
    // Add new connections
    connections.forEach(connection => {
      if (!currentEdgeIds.has(connection.id)) {
        edges.add({
          id: connection.id,
          from: connection.sourceId,
          to: connection.targetId,
          label: connection.type,
          dashes: connection.type !== 'P2P',
          color: {
            color: connection.type === 'P2P' ? '#10B981' : 
                   connection.type === 'LAN' ? '#3B82F6' : '#8B5CF6',
            highlight: connection.type === 'P2P' ? '#059669' : 
                        connection.type === 'LAN' ? '#2563EB' : '#7C3AED',
          },
          title: `${connection.type} connection established ${new Date(connection.established).toLocaleString()}`
        });
      }
    });
    
    // Remove connections that no longer exist
    edges.getIds().forEach(id => {
      if (!connections.some(c => c.id === id)) {
        edges.remove(id);
      }
    });
    
  }, [devices, users, connections]);

  return (
    <div className="relative h-full">
      <div ref={containerRef} className="network-canvas" />
      {hoveredNode && (
        <div className="absolute bottom-4 right-4 bg-white dark:bg-gray-800 p-3 rounded-md shadow-md border border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold mb-1">Node Information</h3>
          {devices.find(d => d.id === hoveredNode) ? (
            <DeviceInfo deviceId={hoveredNode} />
          ) : (
            <UserInfo userId={hoveredNode} />
          )}
        </div>
      )}
    </div>
  );
};

// Helper components for node information
const DeviceInfo: React.FC<{ deviceId: string }> = ({ deviceId }) => {
  const { devices } = useNetwork();
  const device = devices.find(d => d.id === deviceId);
  
  if (!device) return null;
  
  return (
    <div className="text-sm">
      <p><span className="font-medium">Name:</span> {device.name}</p>
      <p><span className="font-medium">IP:</span> {device.ip}</p>
      <p><span className="font-medium">MAC:</span> {device.mac}</p>
      <p><span className="font-medium">Type:</span> {device.type}</p>
      <p><span className="font-medium">Status:</span> {device.status}</p>
    </div>
  );
};

const UserInfo: React.FC<{ userId: string }> = ({ userId }) => {
  const { users, connections } = useNetwork();
  const user = users.find(u => u.id === userId);
  
  if (!user) return null;
  
  const userConnections = connections.filter(
    c => c.sourceId === userId || c.targetId === userId
  );
  
  return (
    <div className="text-sm">
      <p><span className="font-medium">Name:</span> {user.name}</p>
      <p><span className="font-medium">Status:</span> {user.status}</p>
      <p><span className="font-medium">Connections:</span> {userConnections.length}</p>
    </div>
  );
};

export default NetworkGraph;