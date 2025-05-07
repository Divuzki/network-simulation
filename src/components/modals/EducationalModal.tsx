import React from "react";
import { X, BookOpen, Wifi, Network, Users, Router } from "lucide-react";

interface EducationalModalProps {
  topic: string;
  onClose: () => void;
}

const EducationalModal: React.FC<EducationalModalProps> = ({
  topic,
  onClose,
}) => {
  const getContent = () => {
    switch (topic) {
      case "welcome":
        return {
          title: "Welcome to Network Visualizer",
          icon: <BookOpen className="h-6 w-6 text-blue-500" />,
          content: (
            <>
              <p className="mb-4">
                This application allows you to visualize your network, detect
                devices, and understand different types of connections.
              </p>
              <h4 className="font-bold mb-2">Getting Started:</h4>
              <ol className="list-decimal pl-5 mb-4 space-y-2">
                <li>
                  Click the <strong>Scan Network</strong> button to detect
                  devices
                </li>
                <li>
                  Connect to other users by clicking on their name in the
                  sidebar
                </li>
                <li>
                  Explore the network graph by zooming, panning, and clicking on
                  nodes
                </li>
                <li>
                  Learn about networking concepts by clicking on different
                  elements
                </li>
              </ol>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                All network scanning is performed locally and with your
                permission. No data is sent to external servers.
              </p>
            </>
          ),
        };
      case "p2p":
        return {
          title: "Peer-to-Peer (P2P) Connections",
          icon: <Users className="h-6 w-6 text-green-500" />,
          content: (
            <>
              <p className="mb-4">
                Peer-to-Peer (P2P) connections establish a direct link between
                two devices without requiring an intermediary server.
              </p>
              <h4 className="font-bold mb-2">Key Characteristics:</h4>
              <ul className="list-disc pl-5 mb-4 space-y-2">
                <li>Direct communication between devices</li>
                <li>No central server required</li>
                <li>Typically faster for direct transfers</li>
                <li>
                  Used in applications like file sharing, video calls, and
                  gaming
                </li>
                <li className="font-semibold text-green-700 dark:text-green-400">
                  Limited to 1-to-1 connections only (two users per connection)
                </li>
              </ul>
              <h4 className="font-bold mb-2">Technologies:</h4>
              <p className="mb-4">
                P2P connections often use technologies like WebRTC for
                browser-based applications, or dedicated P2P protocols like
                BitTorrent for file sharing.
              </p>
              <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-md">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  In our visualization, P2P connections are shown as{" "}
                  <span className="connection-p2p">solid green lines</span>
                  between nodes.
                </p>
              </div>
            </>
          ),
        };
      case "lan":
        return {
          title: "Local Area Network (LAN) Connections",
          icon: <Network className="h-6 w-6 text-blue-500" />,
          content: (
            <>
              <p className="mb-4">
                A Local Area Network (LAN) is a network that connects devices
                within a limited area, typically using wired connections like
                Ethernet.
              </p>
              <h4 className="font-bold mb-2">Key Characteristics:</h4>
              <ul className="list-disc pl-5 mb-4 space-y-2">
                <li>High-speed, reliable connections</li>
                <li>Usually limited to a single location (home, office)</li>
                <li>Uses routing equipment to manage traffic</li>
                <li>Typically faster and more stable than wireless</li>
              </ul>
              <h4 className="font-bold mb-2">Common Uses:</h4>
              <p className="mb-4">
                LANs are commonly used in businesses, schools, and homes for
                file sharing, printer sharing, and accessing shared resources on
                the network.
              </p>
              <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-md">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  In our visualization, LAN connections are shown as{" "}
                  <span className="connection-lan">dashed blue lines</span>
                  between nodes, typically passing through a router.
                </p>
              </div>
            </>
          ),
        };
      case "wan":
        return {
          title: "Wireless Local Area Network (WAN) Connections",
          icon: <Wifi className="h-6 w-6 text-purple-500" />,
          content: (
            <>
              <p className="mb-4">
                A Wireless Local Area Network (WAN) connects devices using
                wireless communication, most commonly Wi-Fi technology.
              </p>
              <h4 className="font-bold mb-2">Key Characteristics:</h4>
              <ul className="list-disc pl-5 mb-4 space-y-2">
                <li>No physical cables needed</li>
                <li>Flexibility in device placement</li>
                <li>Operates using radio frequencies (2.4GHz, 5GHz, 6GHz)</li>
                <li>Slightly higher latency than wired connections</li>
              </ul>
              <h4 className="font-bold mb-2">Standards:</h4>
              <p className="mb-4">
                WANs typically follow IEEE 802.11 standards (Wi-Fi), with
                various versions like 802.11n, 802.11ac, and 802.11ax (Wi-Fi 6)
                offering different speeds and features.
              </p>
              <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-md">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  In our visualization, WAN connections are shown as{" "}
                  <span className="connection-wan">dashed purple lines</span>
                  between nodes, typically connecting through a wireless access
                  point.
                </p>
              </div>
            </>
          ),
        };
      case "router":
        return {
          title: "Routers in Network Infrastructure",
          icon: <Router className="h-6 w-6 text-red-500" />,
          content: (
            <>
              <p className="mb-4">
                Routers are devices that forward data packets between computer
                networks, directing traffic to the proper destination.
              </p>
              <h4 className="font-bold mb-2">Key Functions:</h4>
              <ul className="list-disc pl-5 mb-4 space-y-2">
                <li>
                  Connect multiple networks together (e.g., your home network to
                  the internet)
                </li>
                <li>Assign IP addresses to devices on the network (DHCP)</li>
                <li>Provide network security through firewall functionality</li>
                <li>Optimize network traffic using routing protocols</li>
              </ul>
              <h4 className="font-bold mb-2">In Home Networks:</h4>
              <p className="mb-4">
                Modern home routers typically combine several functions: router,
                switch, wireless access point, and firewall. They allow multiple
                devices to connect to the internet while providing local network
                services.
              </p>
              <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-md">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  In our visualization, routers are shown as{" "}
                  <span className="text-red-500 dark:text-red-400 font-medium">
                    red nodes
                  </span>
                  and typically serve as central connection points for LAN and
                  WAN connections.
                </p>
              </div>
            </>
          ),
        };
      case "user-connection":
        return {
          title: "User Connections",
          icon: <Users className="h-6 w-6 text-indigo-500" />,
          content: (
            <>
              <p className="mb-4">
                Users can connect to each other through different types of
                network connections, depending on their physical location and
                network infrastructure.
              </p>
              <h4 className="font-bold mb-2">Connection Types:</h4>
              <ul className="list-disc pl-5 mb-4">
                <li className="mb-2">
                  <span className="connection-p2p font-medium">
                    P2P (Peer-to-Peer)
                  </span>
                  : Direct connection between users without an intermediary.
                  Ideal for direct communication and file sharing.
                </li>
                <li className="mb-2">
                  <span className="connection-lan font-medium">
                    LAN (Local Area Network)
                  </span>
                  : Connection through a wired local network. Provides high
                  speed and reliability when users are on the same network.
                </li>
                <li>
                  <span className="connection-wan font-medium">
                    WAN (Wireless LAN)
                  </span>
                  : Connection through a wireless network. Offers flexibility
                  but might have slightly higher latency.
                </li>
              </ul>
              <h4 className="font-bold mb-2">Establishing Connections:</h4>
              <p className="mb-4">
                To connect with another user in this application, select them
                from the device list and choose the appropriate connection type.
                The system will automatically set up the connection and display
                it in the network graph.
              </p>
            </>
          ),
        };
      case "general":
        return {
          title: "About Network Visualization",
          icon: <BookOpen className="h-6 w-6 text-blue-500" />,
          content: (
            <>
              <p className="mb-4">
                This application helps you understand your network environment
                by visualizing devices and the connections between them.
              </p>
              <h4 className="font-bold mb-2">Key Concepts:</h4>
              <ul className="list-disc pl-5 mb-4 space-y-2">
                <li>
                  <span className="font-medium">Devices</span>: Hardware on your
                  network, including computers, phones, routers, and other
                  connected devices
                </li>
                <li>
                  <span className="font-medium">Connections</span>: The ways
                  devices communicate with each other, including P2P, LAN, and
                  WAN
                </li>
                <li>
                  <span className="font-medium">Network Topology</span>: The
                  arrangement of devices and their connections, visualized as a
                  graph
                </li>
              </ul>
              <h4 className="font-bold mb-2">Educational Resources:</h4>
              <p className="mb-4">
                Click on any element in the network graph to learn more about
                that specific type of device or connection. You can also access
                educational content through the info button in the header.
              </p>
              <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-md">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  The network visualization updates in real-time as devices are
                  detected and connections are established or removed.
                </p>
              </div>
            </>
          ),
        };
      default:
        return {
          title: "Network Information",
          icon: <Network className="h-6 w-6 text-blue-500" />,
          content: (
            <p>
              Select a specific element in the network graph to learn more about
              it.
            </p>
          ),
        };
    }
  };

  const { title, icon, content } = getContent();

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content max-w-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center modal-header">
          <h3 className="flex items-center space-x-2">
            {icon}
            <span>{title}</span>
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-6">{content}</div>

        <div className="flex justify-end">
          <button className="btn btn-primary" onClick={onClose}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

export default EducationalModal;
