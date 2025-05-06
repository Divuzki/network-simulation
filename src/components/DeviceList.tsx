import React, { useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  Laptop,
  Router,
  Smartphone,
  Network,
  User,
} from "lucide-react";
import { useNetwork } from "../context/NetworkContext";

interface DeviceListProps {
  onConnect: () => void;
}

const DeviceList: React.FC<DeviceListProps> = ({ onConnect }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const { devices, users, connections } = useNetwork();

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case "computer":
        return <Laptop className="h-5 w-5 text-blue-500" />;
      case "router":
        return <Router className="h-5 w-5 text-red-500" />;
      case "smartphone":
        return <Smartphone className="h-5 w-5 text-green-500" />;
      default:
        return <Network className="h-5 w-5 text-purple-500" />;
    }
  };

  return (
    <aside
      className={`
      bg-gray-100 dark:bg-gray-800 p-4 transition-all duration-300
      ${isExpanded ? "w-full md:w-80" : "w-16"}
    `}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className={`font-semibold ${isExpanded ? "block" : "hidden"}`}>
          Network Devices
        </h2>
        <button
          onClick={toggleExpand}
          className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          aria-label={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
        >
          {isExpanded ? (
            <ChevronLeft className="h-5 w-5" />
          ) : (
            <ChevronRight className="h-5 w-5" />
          )}
        </button>
      </div>

      {isExpanded && (
        <>
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-sm uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Users ({users.length})
              </h3>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="device-item flex items-center justify-between"
                  onClick={onConnect}
                >
                  <div className="flex items-center">
                    <div className="mr-2 flex-shrink-0">
                      <User className="h-5 w-5 text-indigo-500" />
                    </div>
                    <div>
                      <div className="font-medium">{user.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Status: {user.status}
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    {connections.some(
                      (c) =>
                        (c.sourceId === user.id || c.targetId === user.id) &&
                        c.type === "P2P"
                    ) && (
                      <span className="connection-p2p text-xs px-1 rounded">
                        P2P
                      </span>
                    )}
                    {connections.some(
                      (c) =>
                        (c.sourceId === user.id || c.targetId === user.id) &&
                        c.type === "LAN"
                    ) && (
                      <span className="connection-lan text-xs px-1 rounded">
                        LAN
                      </span>
                    )}
                    {connections.some(
                      (c) =>
                        (c.sourceId === user.id || c.targetId === user.id) &&
                        c.type === "WAN"
                    ) && (
                      <span className="connection-wan text-xs px-1 rounded">
                        WAN
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-sm uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Devices ({devices.length})
              </h3>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {devices.map((device) => (
                <div
                  key={device.id}
                  className="device-item flex items-center justify-between"
                >
                  <div className="flex items-center">
                    <div className="mr-2 flex-shrink-0">
                      {getDeviceIcon(device.type)}
                    </div>
                    <div>
                      <div className="font-medium">{device.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {device.ip}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded">
                    {device.status}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </aside>
  );
};

// ChevronLeft component for sidebar toggle
const ChevronLeft: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="15 18 9 12 15 6"></polyline>
  </svg>
);

export default DeviceList;
