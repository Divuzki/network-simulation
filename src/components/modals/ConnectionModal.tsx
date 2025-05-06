import React, { useState } from 'react';
import { X, Link, User } from 'lucide-react';
import { useNetwork } from '../../context/NetworkContext';

interface ConnectionModalProps {
  onClose: () => void;
}

const ConnectionModal: React.FC<ConnectionModalProps> = ({ onClose }) => {
  const { users, currentUser, connectToUser } = useNetwork();
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [connectionType, setConnectionType] = useState<'P2P' | 'LAN' | 'WLAN'>('P2P');
  
  const handleConnect = async () => {
    if (!selectedUser) return;
    
    await connectToUser(selectedUser, connectionType);
    onClose();
  };
  
  // Filter out current user from the list
  const availableUsers = users.filter(user => currentUser && user.id !== currentUser.id);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center modal-header">
          <h3 className="flex items-center space-x-2">
            <Link className="h-5 w-5 text-blue-500" />
            <span>Connect to User</span>
          </h3>
          <button 
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="mb-6">
          <div className="mb-4">
            <label htmlFor="user-select" className="block mb-2 font-medium">
              Select User
            </label>
            {availableUsers.length > 0 ? (
              <select
                id="user-select"
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="input w-full"
              >
                <option value="">Select a user...</option>
                {availableUsers.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.status})
                  </option>
                ))}
              </select>
            ) : (
              <div className="input w-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                No other users available
              </div>
            )}
          </div>
          
          <div className="mb-4">
            <label className="block mb-2 font-medium">
              Connection Type
            </label>
            <div className="grid grid-cols-3 gap-3">
              <ConnectionTypeButton 
                type="P2P" 
                selected={connectionType === 'P2P'} 
                onClick={() => setConnectionType('P2P')}
              />
              <ConnectionTypeButton 
                type="LAN" 
                selected={connectionType === 'LAN'} 
                onClick={() => setConnectionType('LAN')}
              />
              <ConnectionTypeButton 
                type="WLAN" 
                selected={connectionType === 'WLAN'} 
                onClick={() => setConnectionType('WLAN')}
              />
            </div>
          </div>
          
          <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-md">
            <h4 className="text-sm font-semibold mb-2">About {connectionType} Connections</h4>
            {connectionType === 'P2P' ? (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Peer-to-Peer connections establish a direct link between users, 
                without going through a central server.
              </p>
            ) : connectionType === 'LAN' ? (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Local Area Network connections route through your local network 
                infrastructure, typically using wired ethernet.
              </p>
            ) : (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Wireless Local Area Network connections use Wi-Fi to communicate 
                through your wireless access point or router.
              </p>
            )}
          </div>
        </div>
        
        <div className="flex justify-end space-x-3">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button 
            className={`btn btn-primary flex items-center space-x-2 ${
              !selectedUser ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            onClick={handleConnect}
            disabled={!selectedUser}
          >
            <User className="h-5 w-5" />
            <span>Connect</span>
          </button>
        </div>
      </div>
    </div>
  );
};

interface ConnectionTypeButtonProps {
  type: 'P2P' | 'LAN' | 'WLAN';
  selected: boolean;
  onClick: () => void;
}

const ConnectionTypeButton: React.FC<ConnectionTypeButtonProps> = ({ 
  type, selected, onClick 
}) => {
  const baseClasses = "p-3 rounded-md border text-center cursor-pointer transition-all";
  const selectedClasses = selected
    ? type === 'P2P' 
      ? "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
      : type === 'LAN'
      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400"
      : "border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400"
    : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500";
  
  return (
    <div 
      className={`${baseClasses} ${selectedClasses}`}
      onClick={onClick}
    >
      <span className="text-sm font-medium">{type}</span>
    </div>
  );
};

export default ConnectionModal;