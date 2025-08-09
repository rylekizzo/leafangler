import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import { SensorService, Angles, Position, SurfaceNormal, LeafOrientation } from './services/sensorService';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

interface Recording {
  timestamp: Date;
  angles: Angles;
  position: Position;
  normal: SurfaceNormal;
  orientation: LeafOrientation;
  gps: { latitude: number; longitude: number; altitude: number | null } | null;
  tag: string;
}

function App() {
  const [angles, setAngles] = useState<Angles>({ pitch: 0, roll: 0, yaw: 0 });
  const [position, setPosition] = useState<Position>({ x: 0, y: 0, z: 0 });
  const [orientation, setOrientation] = useState<LeafOrientation>({ zenith: 0, azimuth: 0 });
  const [normal, setNormal] = useState<SurfaceNormal>({ x: 0, y: 0, z: 1 });
  const [recordings, setRecordings] = useState<Recording[]>(() => {
    // Load recordings from localStorage on initial mount
    const saved = localStorage.getItem('leafangler-recordings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Convert timestamp strings back to Date objects
        return parsed.map((r: any) => ({
          ...r,
          timestamp: new Date(r.timestamp)
        }));
      } catch (e) {
        console.error('Failed to load saved recordings:', e);
        return [];
      }
    }
    return [];
  });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentTag, setCurrentTag] = useState(() => {
    // Load last used tag from localStorage
    return localStorage.getItem('leafangler-last-tag') || '';
  });
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Load theme preference from localStorage
    const saved = localStorage.getItem('leafangler-dark-mode');
    return saved !== null ? saved === 'true' : true;
  });
  const [showSettings, setShowSettings] = useState(false);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [needsPermission, setNeedsPermission] = useState(false);
  const [isHiding, setIsHiding] = useState(false);
  const [gpsCoords, setGpsCoords] = useState<{latitude: number; longitude: number; altitude: number | null} | null>(null);
  
  const sensorService = useRef<SensorService>(new SensorService());
  const unsubscribeAngles = useRef<(() => void) | null>(null);
  const unsubscribePosition = useRef<(() => void) | null>(null);

  const startSensors = async () => {
    // Start sensor listening with permissions
    await sensorService.current.startListening();
    setPermissionsGranted(true);
    
    unsubscribeAngles.current = sensorService.current.subscribe((newAngles) => {
      setAngles(newAngles);
      // Calculate orientation data when angles changes
      const newNormal = sensorService.current.calculateSurfaceNormal(newAngles);
      const newOrientation = sensorService.current.calculateLeafOrientation(newNormal);
      setNormal(newNormal);
      setOrientation(newOrientation);
    });
    unsubscribePosition.current = sensorService.current.subscribePosition(setPosition);
    
    // Update GPS coordinates periodically
    const gpsInterval = setInterval(() => {
      const coords = sensorService.current.getGPSCoordinates();
      setGpsCoords(coords);
    }, 1000);
    
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
      clearInterval(gpsInterval);
    };
  };

  // Save recordings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('leafangler-recordings', JSON.stringify(recordings));
  }, [recordings]);
  
  // Save tag preference to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('leafangler-last-tag', currentTag);
  }, [currentTag]);
  
  // Save theme preference to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('leafangler-dark-mode', isDarkMode.toString());
  }, [isDarkMode]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    
    // Check if we need permission (iOS 13+)
    const checkPermission = async () => {
      // Check for iOS devices
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      
      if (typeof (DeviceOrientationEvent as any).requestPermission === 'function' || isIOS) {
        // This is iOS - need user interaction to request permission
        setNeedsPermission(true);
        console.log('iOS device detected - permission button required');
      } else {
        // Not iOS - try to start automatically
        try {
          cleanup = await startSensors();
        } catch (error) {
          console.log('Auto-start failed:', error);
        }
      }
    };
    
    checkPermission();
    
    return () => {
      if (cleanup) cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRecord = () => {
    setRecordings([...recordings, { 
      timestamp: new Date(), 
      angles, 
      position,
      normal,
      orientation,
      gps: gpsCoords,
      tag: currentTag.trim() || 'Default' 
    }]);
  };

  const handleUndo = () => {
    if (recordings.length > 0) {
      setRecordings(recordings.slice(0, -1));
    }
  };

  const handleSave = async () => {
    if (recordings.length === 0) return;
    
    console.log('Save button clicked, recordings:', recordings.length);
    console.log('Platform check - isNativePlatform:', Capacitor.isNativePlatform());
    console.log('Platform info:', Capacitor.getPlatform());
    
    // Create CSV content with new columns for zenith, azimuth, normal vector, and GPS
    const headers = ['Obs', 'Timestamp', 'Year', 'Month', 'Day', 'Tag', 'Zenith', 'Azimuth', 'Latitude', 'Longitude', 'Altitude_m', 'Pitch', 'Roll', 'Yaw', 'Normal_X', 'Normal_Y', 'Normal_Z', 'Accel_X_m', 'Accel_Y_m', 'Accel_Z_m'];
    const csvRows = [
      headers.join(','),
      ...recordings.map((r, index) => {
        // Format timestamp as YYYY-MM-DD HH:MM:SS for Excel/Python compatibility
        const year = r.timestamp.getFullYear();
        const month = String(r.timestamp.getMonth() + 1).padStart(2, '0');
        const day = String(r.timestamp.getDate()).padStart(2, '0');
        const hours = String(r.timestamp.getHours()).padStart(2, '0');
        const minutes = String(r.timestamp.getMinutes()).padStart(2, '0');
        const seconds = String(r.timestamp.getSeconds()).padStart(2, '0');
        const formattedTimestamp = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        
        return [
          index + 1, // Observation number starting from 1
          formattedTimestamp,
          r.timestamp.getFullYear(),
          r.timestamp.getMonth() + 1, // getMonth() returns 0-11, so add 1
          r.timestamp.getDate(),
          r.tag,
          r.orientation.zenith.toFixed(2),
          r.orientation.azimuth.toFixed(2),
          r.gps?.latitude?.toFixed(6) || '',
          r.gps?.longitude?.toFixed(6) || '',
          r.gps?.altitude?.toFixed(2) || '',
          r.angles.pitch.toFixed(2),
          r.angles.roll.toFixed(2),
          r.angles.yaw.toFixed(2),
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
    const fileName = `leaf-angles-${new Date().toISOString().split('T')[0]}.csv`;
    
    // For now, use web approach even on native platform since plugins aren't working
    // TODO: Fix Capacitor plugin registration
    
    // Create a downloadable blob and trigger download/share
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    if (Capacitor.isNativePlatform()) {
      // Use Web Share API on iOS for native sharing experience
      if (navigator.share) {
        try {
          // Create a File object from the CSV data
          const file = new File([csvContent], fileName, { type: 'text/csv' });
          
          await navigator.share({
            title: 'LeafAngler Data Export',
            text: `${recordings.length} leaf angle measurements from LeafAngler`,
            files: [file]
          });
        } catch (error: any) {
          // Fallback if file sharing fails - share as text
          try {
            await navigator.share({
              title: 'LeafAngler Data Export',
              text: `${recordings.length} leaf angle measurements:\n\n${csvContent}`
            });
          } catch (textError: any) {
            console.error('Share error:', textError);
            alert('Sharing is not available on this device.');
          }
        }
      } else {
        // Fallback for devices without Web Share API
        alert('Sharing is not available on this device. Please copy the data manually.');
        console.log('CSV Data:', csvContent);
      }
    } else {
      // Web platform - use existing logic      
      // Check if we're on Safari/iOS web
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      
      if (isIOS || isSafari) {
        // For Safari/iOS, use FileReader approach
        const reader = new FileReader();
        reader.onload = function() {
          const a = document.createElement('a');
          a.href = reader.result as string;
          a.download = fileName;
          a.style.display = 'none';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        };
        reader.readAsDataURL(blob);
      } else {
        // Standard approach for other browsers
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 100);
      }
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  // Show fullscreen permission screen if needed
  if ((needsPermission || isHiding) && !permissionsGranted) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 transition-colors ${
        isDarkMode 
          ? 'bg-dark-900 text-white' 
          : 'bg-gray-50 text-gray-900'
      }`}>
        <div 
          className={`max-w-md w-full rounded-2xl p-8 text-center transition-all duration-500 ease-out ${
            isDarkMode ? 'bg-dark-800' : 'bg-white shadow-xl'
          } ${
            isHiding 
              ? 'opacity-0 scale-95 transform -translate-y-4' 
              : 'opacity-100 scale-100 transform translate-y-0'
          }`}
        >
          <img 
            src={`${process.env.PUBLIC_URL}/logo.png`}
            alt="LeafAngler" 
            className="w-48 h-48 mx-auto mb-6"
            onError={(e) => {
              console.error('Logo failed to load');
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <h1 className={`mb-2 text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            LeafAngler
          </h1>
          <p className={`mb-8 text-base ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            To measure leaf angles, we need access to your device's motion sensors and GPS location.
          </p>
          <button
            onClick={async () => {
              try {
                // Request permissions first
                await startSensors();
                // Only animate if permissions were granted successfully
                setIsHiding(true);
                // Wait for animation to complete before transitioning
                setTimeout(() => {
                  setNeedsPermission(false);
                  setIsHiding(false);
                }, 500);
              } catch (error) {
                // Don't animate if permissions were denied
                console.error('Permission error:', error);
                alert('Permission denied. Please reload the page and try again.');
              }
            }}
            className="relative px-10 py-3.5 rounded-full text-lg font-semibold transition-all transform active:scale-95 flex items-center justify-center gap-3 mx-auto"
            style={{
              background: '#1a5e3a',
              boxShadow: `
                0 1px 2px rgba(0, 0, 0, 0.2),
                inset 0 1px 0 rgba(255, 255, 255, 0.1)
              `,
              color: 'white',
              border: '2px solid #2a7c4f',
              letterSpacing: '0.3px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#1f6b42';
              e.currentTarget.style.borderColor = '#34a065';
              e.currentTarget.style.transform = 'scale(1.02)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#1a5e3a';
              e.currentTarget.style.borderColor = '#2a7c4f';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            {/* Eco leaf icon from Material Symbols */}
            <span 
              className="material-symbols-outlined"
              style={{
                fontSize: '20px',
                fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24"
              }}
            >
              temp_preferences_eco
            </span>
            Start Measuring
          </button>
        </div>
      </div>
    );
  }

  // Main app after permissions granted
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
              
              <div className="flex items-center justify-between mb-6">
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
              
              {/* Clear Data Button */}
              <div className={`pt-6 border-t ${isDarkMode ? 'border-dark-700' : 'border-gray-200'}`}>
                <button
                  onClick={() => {
                    if (window.confirm('This will clear all recorded measurements. Are you sure?')) {
                      setRecordings([]);
                      localStorage.removeItem('leafangler-recordings');
                    }
                  }}
                  disabled={recordings.length === 0}
                  className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isDarkMode 
                      ? 'bg-red-900/20 hover:bg-red-900/30 text-red-400 disabled:opacity-50 disabled:cursor-not-allowed' 
                      : 'bg-red-50 hover:bg-red-100 text-red-600 disabled:opacity-50 disabled:cursor-not-allowed'
                  }`}
                >
                  Clear All Recordings ({recordings.length})
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
          
          {/* GPS Coordinates */}
          {gpsCoords && (
            <div className={`text-center py-2 text-xs sm:text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              <span className="font-mono">
                GPS: {gpsCoords.latitude.toFixed(6)}°, {gpsCoords.longitude.toFixed(6)}°
                {gpsCoords.altitude && ` | Alt: ${gpsCoords.altitude.toFixed(1)}m`}
              </span>
            </div>
          )}
          
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
                  <th className="text-center py-2 px-1">Obs</th>
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
                    <td className="py-2 sm:py-3 px-1 text-center font-mono text-xs sm:text-sm font-semibold">
                      {index + 1}
                    </td>
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
            Share
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