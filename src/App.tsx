import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import { SensorService, Angles, Position } from './services/sensorService';

interface Recording {
  timestamp: Date;
  angles: Angles;
  position: Position;
  tag: string;
}

function App() {
  const [angles, setAngles] = useState<Angles>({ pitch: 0, roll: 0, yaw: 0 });
  const [position, setPosition] = useState<Position>({ x: 0, y: 0, z: 0 });
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentTag, setCurrentTag] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  
  const sensorService = useRef<SensorService>(new SensorService());
  const unsubscribeAngles = useRef<(() => void) | null>(null);
  const unsubscribePosition = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Start sensor listening immediately
    sensorService.current.startListening();
    unsubscribeAngles.current = sensorService.current.subscribe(setAngles);
    unsubscribePosition.current = sensorService.current.subscribePosition(setPosition);
    
    // Update time every second
    const timeInterval = setInterval(() => setCurrentTime(new Date()), 1000);
    
    return () => {
      if (unsubscribeAngles.current) {
        unsubscribeAngles.current();
      }
      if (unsubscribePosition.current) {
        unsubscribePosition.current();
      }
      sensorService.current.stopListening();
      clearInterval(timeInterval);
    };
  }, []);

  const handleRecord = () => {
    setRecordings([...recordings, { 
      timestamp: new Date(), 
      angles, 
      position,
      tag: currentTag.trim() || 'Default' 
    }]);
  };

  const handleUndo = () => {
    if (recordings.length > 0) {
      setRecordings(recordings.slice(0, -1));
    }
  };

  const handleSave = () => {
    if (recordings.length === 0) return;
    
    // Create CSV content
    const headers = ['Timestamp', 'Year', 'Month', 'Day', 'Tag', 'Pitch', 'Roll', 'Yaw', 'X', 'Y', 'Z'];
    const csvRows = [
      headers.join(','),
      ...recordings.map(r => {
        // Format timestamp as YYYY-MM-DD HH:MM:SS for Excel/Python compatibility
        const year = r.timestamp.getFullYear();
        const month = String(r.timestamp.getMonth() + 1).padStart(2, '0');
        const day = String(r.timestamp.getDate()).padStart(2, '0');
        const hours = String(r.timestamp.getHours()).padStart(2, '0');
        const minutes = String(r.timestamp.getMinutes()).padStart(2, '0');
        const seconds = String(r.timestamp.getSeconds()).padStart(2, '0');
        const formattedTimestamp = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        
        return [
          formattedTimestamp,
          r.timestamp.getFullYear(),
          r.timestamp.getMonth() + 1, // getMonth() returns 0-11, so add 1
          r.timestamp.getDate(),
          r.tag,
          r.angles.pitch.toFixed(2),
          r.angles.roll.toFixed(2),
          r.angles.yaw.toFixed(2),
          r.position.x.toFixed(3),
          r.position.y.toFixed(3),
          r.position.z.toFixed(3)
        ].join(',');
      })
    ];
    
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leaf-angles-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  return (
    <div className={`min-h-screen p-4 transition-colors ${
      isDarkMode 
        ? 'bg-dark-900 text-white' 
        : 'bg-gray-50 text-gray-900'
    }`}>
      <div className="max-w-4xl mx-auto">
        
        {/* Settings Button */}
        <div className="flex justify-end mb-4">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-lg transition-colors ${
              isDarkMode 
                ? 'hover:bg-dark-700 text-gray-400 hover:text-white' 
                : 'hover:bg-gray-200 text-gray-500 hover:text-gray-700'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>

        {/* Settings Panel - Floating Window */}
        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className={`relative w-80 max-w-sm mx-4 rounded-2xl p-6 transition-colors ${
              isDarkMode ? 'bg-dark-800' : 'bg-white shadow-xl'
            }`}>
              {/* Close button */}
              <button
                onClick={() => setShowSettings(false)}
                className={`absolute top-4 right-4 p-1 rounded-lg transition-colors ${
                  isDarkMode 
                    ? 'hover:bg-dark-700 text-gray-400 hover:text-white' 
                    : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <h3 className={`text-lg font-semibold mb-6 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Settings
              </h3>
              
              <div className="flex items-center justify-between">
                <span className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Mode
                </span>
                <button
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className={`relative w-14 h-7 rounded-full transition-colors ${
                    isDarkMode ? 'bg-green-600' : 'bg-gray-300'
                  }`}
                >
                  <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full transition-transform flex items-center justify-center ${
                    isDarkMode ? 'translate-x-7' : 'translate-x-0.5'
                  }`}>
                    {isDarkMode ? (
                      <svg className="w-3 h-3 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path>
                      </svg>
                    ) : (
                      <svg className="w-3 h-3 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd"></path>
                      </svg>
                    )}
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Current Values Card */}
        <div className={`rounded-2xl p-6 mb-4 transition-colors ${
          isDarkMode ? 'bg-dark-800' : 'bg-white shadow-lg'
        }`}>
          <div className="grid grid-cols-4 gap-6 text-center mb-4">
            <div>
              <div className={`text-sm mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Time</div>
              <div className="text-2xl font-mono">{formatTime(currentTime)}</div>
            </div>
            <div>
              <div className={`text-sm mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Pitch</div>
              <div className="text-2xl font-mono">{angles.pitch.toFixed(2)}°</div>
            </div>
            <div>
              <div className={`text-sm mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Roll</div>
              <div className="text-2xl font-mono">{angles.roll.toFixed(2)}°</div>
            </div>
            <div>
              <div className={`text-sm mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Yaw</div>
              <div className="text-2xl font-mono">{angles.yaw.toFixed(2)}°</div>
            </div>
          </div>
          
          {/* Tag Input */}
          <div className={`border-t pt-4 ${isDarkMode ? 'border-dark-700' : 'border-gray-200'}`}>
            <div className="flex items-center gap-3">
              <label className={`text-sm whitespace-nowrap ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Tag:</label>
              <input
                type="text"
                value={currentTag}
                onChange={(e) => setCurrentTag(e.target.value)}
                placeholder="Enter tag name (optional)"
                className={`flex-1 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors ${
                  isDarkMode 
                    ? 'bg-dark-700 text-white border-dark-600' 
                    : 'bg-gray-100 text-gray-900 border-gray-300'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Data Table Card */}
        <div className={`rounded-2xl p-6 mb-4 transition-colors ${
          isDarkMode ? 'bg-dark-800' : 'bg-white shadow-lg'
        }`}>
          <div className="h-80 overflow-y-auto">
            <table className="w-full">
              <thead className={`sticky top-0 ${isDarkMode ? 'bg-dark-800' : 'bg-white'}`}>
                <tr className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  <th className="text-left py-2">Time</th>
                  <th className="text-left py-2">Tag</th>
                  <th className="text-right py-2">Pitch</th>
                  <th className="text-right py-2">Roll</th>
                  <th className="text-right py-2">Yaw</th>
                </tr>
              </thead>
              <tbody>
                {recordings.map((recording, index) => (
                  <tr key={index} className={`border-t ${isDarkMode ? 'border-dark-700' : 'border-gray-200'}`}>
                    <td className="py-3 font-mono text-sm">
                      {formatTime(recording.timestamp)}
                    </td>
                    <td className={`py-3 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      {recording.tag}
                    </td>
                    <td className="py-3 text-right font-mono">
                      {recording.angles.pitch.toFixed(2)}°
                    </td>
                    <td className="py-3 text-right font-mono">
                      {recording.angles.roll.toFixed(2)}°
                    </td>
                    <td className="py-3 text-right font-mono">
                      {recording.angles.yaw.toFixed(2)}°
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {recordings.length === 0 && (
              <div className={`flex items-center justify-center h-60 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                No recordings yet
              </div>
            )}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={handleRecord}
            className="bg-red-600 hover:bg-red-700 text-white px-12 py-4 rounded-2xl text-lg font-semibold transition-colors"
          >
            Record
          </button>
          
          <button
            onClick={handleUndo}
            disabled={recordings.length === 0}
            className={`px-8 py-4 rounded-2xl text-lg transition-colors ${
              isDarkMode
                ? 'bg-dark-700 hover:bg-dark-600 disabled:bg-dark-700 disabled:opacity-50 text-white'
                : 'bg-gray-300 hover:bg-gray-400 disabled:bg-gray-200 disabled:opacity-50 text-gray-700'
            }`}
          >
            Undo
          </button>
          
          <button
            onClick={handleSave}
            disabled={recordings.length === 0}
            className={`px-8 py-4 rounded-2xl text-lg transition-colors ${
              isDarkMode
                ? 'bg-green-600 hover:bg-green-700 disabled:bg-dark-700 disabled:opacity-50 text-white'
                : 'bg-green-500 hover:bg-green-600 disabled:bg-gray-200 disabled:opacity-50 text-white disabled:text-gray-400'
            }`}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;