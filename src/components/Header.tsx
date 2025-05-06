import React from 'react';
import { Network, Moon, Sun, Info } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface HeaderProps {
  onLearnClick: (topic: string) => void;
}

const Header: React.FC<HeaderProps> = ({ onLearnClick }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="bg-white dark:bg-gray-800 shadow-md px-4 py-3">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Network className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          <h1 className="text-xl font-bold">Network Visualizer</h1>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="relative group">
            <button 
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              onClick={() => onLearnClick('general')}
              aria-label="Learn about networking"
            >
              <Info className="h-5 w-5" />
            </button>
            <span className="tooltip hidden group-hover:block">
              Learn about networking
            </span>
          </div>
          
          <div className="relative group">
            <button 
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </button>
            <span className="tooltip hidden group-hover:block">
              {theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;