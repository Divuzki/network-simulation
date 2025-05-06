import React from 'react';
import { Scan, Loader } from 'lucide-react';
import { useNetwork } from '../context/NetworkContext';

interface ScanButtonProps {
  onScanClick: () => void;
}

const ScanButton: React.FC<ScanButtonProps> = ({ onScanClick }) => {
  const { isScanning } = useNetwork();

  return (
    <button
      className="btn btn-primary flex items-center space-x-2"
      onClick={onScanClick}
      disabled={isScanning}
    >
      {isScanning ? (
        <>
          <Loader className="h-5 w-5 animate-spin" />
          <span>Scanning...</span>
        </>
      ) : (
        <>
          <Scan className="h-5 w-5" />
          <span>Scan Network</span>
        </>
      )}
    </button>
  );
};

export default ScanButton;