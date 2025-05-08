import React, { useState } from 'react';
import { X, AlertTriangle, CheckCircle } from 'lucide-react';
import { useNetwork } from '../../context/NetworkContext';

interface PermissionModalProps {
  onClose: () => void;
}

const PermissionModal: React.FC<PermissionModalProps> = ({ onClose }) => {
  const [hasConsented, setHasConsented] = useState(false);
  const { scanNetwork } = useNetwork();

  const handleScan = async () => {
    if (!hasConsented) return;
    onClose();
    await scanNetwork();
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content relative overflow-auto max-md:h-[80%]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center modal-header">
          <h3 className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            <span>Permission Required</span>
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
          <p className="mb-4">
            This action will scan your local network to detect connected
            devices. It will:
          </p>
          <ul className="list-disc pl-5 mb-4 space-y-2">
            <li>Discover devices on your local network</li>
            <li>Identify device types, IP addresses, and MAC addresses</li>
            <li>Display this information in the network visualization</li>
          </ul>
          <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            We do not store or transmit any of this information outside of your
            browser. All scanning is performed locally on your device.
          </p>
          <div className="flex items-center mb-2">
            <input
              type="checkbox"
              id="consent"
              checked={hasConsented}
              onChange={() => setHasConsented(!hasConsented)}
              className="h-4 w-4 mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label
              htmlFor="consent"
              className="text-gray-700 dark:text-gray-300"
            >
              I understand and give permission to scan my local network
            </label>
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className={`btn flex items-center space-x-2 ${
              hasConsented
                ? "btn-primary"
                : "btn-secondary opacity-50 cursor-not-allowed"
            }`}
            onClick={handleScan}
            disabled={!hasConsented}
          >
            <CheckCircle className="h-5 w-5" />
            <span>Allow Scanning</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PermissionModal;