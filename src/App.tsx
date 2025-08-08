import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import { SensorService, Angles, Position, SurfaceNormal, LeafOrientation } from './services/sensorService';

interface Recording {
  timestamp: Date;
  angles: Angles;
  position: Position;
  normal: SurfaceNormal;
  orientation: LeafOrientation;
  tag: string;
}

function App() {
  const [angles, setAngles] = useState<Angles>({ pitch: 0, roll: 0, yaw: 0 });
  const [position, setPosition] = useState<Position>({ x: 0, y: 0, z: 0 });
  const [orientation, setOrientation] = useState<LeafOrientation>({ zenith: 0, azimuth: 0 });
  const [normal, setNormal] = useState<SurfaceNormal>({ x: 0, y: 0, z: 1 });
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
    unsubscribeAngles.current = sensorService.current.subscribe((newAngles) => {
      setAngles(newAngles);
      // Calculate orientation data when angles change
      const newNormal = sensorService.current.calculateSurfaceNormal(newAngles);
      const newOrientation = sensorService.current.calculateLeafOrientation(newNormal);
      setNormal(newNormal);
      setOrientation(newOrientation);
    });
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
      normal,
      orientation,
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
    
    // Create CSV content with new columns for zenith, azimuth, and normal vector
    const headers = ['Timestamp', 'Year', 'Month', 'Day', 'Tag', 'Pitch', 'Roll', 'Yaw', 'Zenith', 'Azimuth', 'Normal_X', 'Normal_Y', 'Normal_Z', 'X', 'Y', 'Z'];
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
          r.orientation.zenith.toFixed(2),
          r.orientation.azimuth.toFixed(2),
          r.normal.x.toFixed(4),
          r.normal.y.toFixed(4),
          r.normal.z.toFixed(4),
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
    <div className={`min-h-screen p-3 sm:p-4 transition-colors ${
      isDarkMode 
        ? 'bg-dark-900 text-white' 
        : 'bg-gray-50 text-gray-900'
    }`}>
      <div className="max-w-4xl mx-auto">

        {/* Settings Panel - Floating Window */}
        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className={`relative w-full max-w-sm rounded-2xl p-6 transition-colors ${
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
        <div className={`rounded-2xl p-4 sm:p-6 mb-4 transition-colors ${
          isDarkMode ? 'bg-dark-800' : 'bg-white shadow-lg'
        }`}>
          {/* First row: Time and primary angles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 text-center mb-4">
            <div>
              <div className={`text-xs sm:text-sm mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Time</div>
              <div className="text-lg sm:text-2xl font-mono leading-tight">{formatTime(currentTime)}</div>
            </div>
            <div>
              <div className={`text-xs sm:text-sm mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Pitch</div>
              <div className="text-lg sm:text-2xl font-mono leading-tight">{angles.pitch.toFixed(2)}°</div>
            </div>
            <div>
              <div className={`text-xs sm:text-sm mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Roll</div>
              <div className="text-lg sm:text-2xl font-mono leading-tight">{angles.roll.toFixed(2)}°</div>
            </div>
            <div>
              <div className={`text-xs sm:text-sm mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Yaw</div>
              <div className="text-lg sm:text-2xl font-mono leading-tight">{angles.yaw.toFixed(2)}°</div>
            </div>
          </div>
          
          {/* Second row: Leaf orientation */}
          <div className={`grid grid-cols-2 gap-4 sm:gap-6 text-center pb-4 border-b ${isDarkMode ? 'border-dark-700' : 'border-gray-200'}`}>
            <div>
              <div className={`text-xs sm:text-sm mb-1 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>Leaf Zenith</div>
              <div className="text-lg sm:text-2xl font-mono leading-tight text-green-500">{orientation.zenith.toFixed(2)}°</div>
            </div>
            <div>
              <div className={`text-xs sm:text-sm mb-1 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>Leaf Azimuth</div>
              <div className="text-lg sm:text-2xl font-mono leading-tight text-green-500">{orientation.azimuth.toFixed(2)}°</div>
            </div>
          </div>
          
          {/* Tag Input */}
          <div className={`border-t pt-4 ${isDarkMode ? 'border-dark-700' : 'border-gray-200'}`}>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <label className={`text-xs sm:text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Tag:</label>
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

        {/* Record Button */}
        <div className="flex justify-center mb-4">
          <button
            onClick={handleRecord}
            className="bg-red-600 hover:bg-red-700 text-white px-16 sm:px-24 py-3 sm:py-4 rounded-2xl text-base sm:text-lg font-semibold transition-colors"
          >
            Record
          </button>
        </div>

        {/* Data Table Card */}
        <div className={`rounded-2xl p-4 sm:p-6 mb-4 transition-colors ${
          isDarkMode ? 'bg-dark-800' : 'bg-white shadow-lg'
        }`}>
          <div className="h-80 overflow-x-auto overflow-y-auto">
            <table className="w-full">
              <thead className={`sticky top-0 ${isDarkMode ? 'bg-dark-800' : 'bg-white'}`}>
                <tr className={`text-xs sm:text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  <th className="text-left py-2 px-1">Time</th>
                  <th className="text-left py-2 px-1">Tag</th>
                  <th className="text-right py-2 px-1">Zenith</th>
                  <th className="text-right py-2 px-1">Azimuth</th>
                  <th className="text-right py-2 px-1 hidden sm:table-cell">Pitch</th>
                  <th className="text-right py-2 px-1 hidden sm:table-cell">Roll</th>
                  <th className="text-right py-2 px-1 hidden sm:table-cell">Yaw</th>
                </tr>
              </thead>
              <tbody>
                {recordings.map((recording, index) => (
                  <tr key={index} className={`border-t ${isDarkMode ? 'border-dark-700' : 'border-gray-200'}`}>
                    <td className="py-2 sm:py-3 px-1 font-mono text-xs sm:text-sm">
                      {formatTime(recording.timestamp)}
                    </td>
                    <td className={`py-2 sm:py-3 px-1 text-xs sm:text-sm truncate max-w-[60px] sm:max-w-none ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      {recording.tag}
                    </td>
                    <td className="py-2 sm:py-3 px-1 text-right font-mono text-xs sm:text-sm text-green-500">
                      {recording.orientation.zenith.toFixed(2)}°
                    </td>
                    <td className="py-2 sm:py-3 px-1 text-right font-mono text-xs sm:text-sm text-green-500">
                      {recording.orientation.azimuth.toFixed(2)}°
                    </td>
                    <td className="py-2 sm:py-3 px-1 text-right font-mono text-xs sm:text-sm hidden sm:table-cell">
                      {recording.angles.pitch.toFixed(2)}°
                    </td>
                    <td className="py-2 sm:py-3 px-1 text-right font-mono text-xs sm:text-sm hidden sm:table-cell">
                      {recording.angles.roll.toFixed(2)}°
                    </td>
                    <td className="py-2 sm:py-3 px-1 text-right font-mono text-xs sm:text-sm hidden sm:table-cell">
                      {recording.angles.yaw.toFixed(2)}°
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {recordings.length === 0 && (
              <div className={`flex items-center justify-center h-60 text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                No recordings yet
              </div>
            )}
          </div>
        </div>

        {/* Undo and Save Buttons */}
        <div className="flex gap-3 sm:gap-4 justify-center mb-4">
          <button
            onClick={handleUndo}
            disabled={recordings.length === 0}
            className={`flex-1 sm:flex-none px-6 sm:px-8 py-3 sm:py-4 rounded-2xl text-base sm:text-lg transition-colors ${
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
            className={`flex-1 sm:flex-none px-6 sm:px-8 py-3 sm:py-4 rounded-2xl text-base sm:text-lg transition-colors ${
              isDarkMode
                ? 'bg-green-600 hover:bg-green-700 disabled:bg-dark-700 disabled:opacity-50 text-white'
                : 'bg-green-500 hover:bg-green-600 disabled:bg-gray-200 disabled:opacity-50 text-white disabled:text-gray-400'
            }`}
          >
            Save
          </button>
        </div>

        {/* Settings Button */}
        <div className="flex justify-center">
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
      </div>
    </div>
  );
}

export default App;