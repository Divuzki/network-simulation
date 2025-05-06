import React, { useState, useEffect } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Header from './components/Header';
import NetworkGraph from './components/NetworkGraph';
import DeviceList from './components/DeviceList';
import ScanButton from './components/ScanButton';
import PermissionModal from './components/modals/PermissionModal';
import ConnectionModal from './components/modals/ConnectionModal';
import EducationalModal from './components/modals/EducationalModal';
import { ThemeProvider } from './context/ThemeContext';
import { NetworkProvider } from './context/NetworkContext';

function App() {
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [showEducationalModal, setShowEducationalModal] = useState(false);
  const [currentTopic, setCurrentTopic] = useState('');

  // Show the educational modal on first visit
  useEffect(() => {
    const hasVisited = localStorage.getItem('hasVisited');
    if (!hasVisited) {
      setShowEducationalModal(true);
      setCurrentTopic('welcome');
      localStorage.setItem('hasVisited', 'true');
    }
  }, []);

  const handleOpenEducationalModal = (topic: string) => {
    setCurrentTopic(topic);
    setShowEducationalModal(true);
  };

  return (
    <ThemeProvider>
      <NetworkProvider>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-200">
          <Header onLearnClick={handleOpenEducationalModal} />
          
          <div className="flex flex-col md:flex-row min-h-[calc(100vh-64px)]">
            <DeviceList onConnect={() => setShowConnectionModal(true)} />
            
            <main className="flex-1 p-4">
              <div className="mb-4 flex justify-between items-center">
                <h2 className="text-2xl font-semibold">Network Visualization</h2>
                <ScanButton onScanClick={() => setShowPermissionModal(true)} />
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md h-[calc(100vh-180px)]">
                <NetworkGraph onEducationClick={handleOpenEducationalModal} />
              </div>
            </main>
          </div>
          
          {showPermissionModal && (
            <PermissionModal 
              onClose={() => setShowPermissionModal(false)} 
            />
          )}
          
          {showConnectionModal && (
            <ConnectionModal 
              onClose={() => setShowConnectionModal(false)} 
            />
          )}
          
          {showEducationalModal && (
            <EducationalModal 
              topic={currentTopic}
              onClose={() => setShowEducationalModal(false)} 
            />
          )}
          
          <ToastContainer position="bottom-right" theme="colored" />
        </div>
      </NetworkProvider>
    </ThemeProvider>
  );
}

export default App;