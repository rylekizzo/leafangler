import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import { SensorService, Angles } from './services/sensorService';

function App() {
  const [angles, setAngles] = useState<Angles>({ pitch: 0, roll: 0, yaw: 0 });
  const [recordings, setRecordings] = useState<Array<{ timestamp: Date; angles: Angles }>>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const sensorService = useRef<SensorService>(new SensorService());
  const unsubscribe = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Start sensor listening immediately
    sensorService.current.startListening();
    unsubscribe.current = sensorService.current.subscribe(setAngles);
    
    // Update time every second
    const timeInterval = setInterval(() => setCurrentTime(new Date()), 1000);
    
    return () => {
      if (unsubscribe.current) {
        unsubscribe.current();
      }
      sensorService.current.stopListening();
      clearInterval(timeInterval);
    };
  }, []);

  const handleRecord = () => {
    setRecordings([...recordings, { timestamp: new Date(), angles }]);
  };

  const handleUndo = () => {
    if (recordings.length > 0) {
      setRecordings(recordings.slice(0, -1));
    }
  };

  const handleSave = () => {
    const data = recordings.map(r => ({
      timestamp: r.timestamp.toISOString(),
      pitch: r.angles.pitch.toFixed(2),
      roll: r.angles.roll.toFixed(2),
      yaw: r.angles.yaw.toFixed(2)
    }));
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leaf-angles-${new Date().toISOString().split('T')[0]}.json`;
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
    <div className="min-h-screen bg-dark-900 text-white p-4">
      <div className="max-w-4xl mx-auto">
        
        {/* Current Values Card */}
        <div className="bg-dark-800 rounded-2xl p-6 mb-4">
          <div className="grid grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-gray-400 text-sm mb-1">Time</div>
              <div className="text-2xl font-mono">{formatTime(currentTime)}</div>
            </div>
            <div>
              <div className="text-gray-400 text-sm mb-1">Pitch</div>
              <div className="text-2xl font-mono">{angles.pitch.toFixed(2)}°</div>
            </div>
            <div>
              <div className="text-gray-400 text-sm mb-1">Roll</div>
              <div className="text-2xl font-mono">{angles.roll.toFixed(2)}°</div>
            </div>
            <div>
              <div className="text-gray-400 text-sm mb-1">Yaw</div>
              <div className="text-2xl font-mono">{angles.yaw.toFixed(2)}°</div>
            </div>
          </div>
        </div>

        {/* Data Table Card */}
        <div className="bg-dark-800 rounded-2xl p-6 mb-4">
          <div className="h-80 overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-dark-800">
                <tr className="text-gray-400 text-sm">
                  <th className="text-left py-2">Time</th>
                  <th className="text-right py-2">Pitch</th>
                  <th className="text-right py-2">Roll</th>
                  <th className="text-right py-2">Yaw</th>
                </tr>
              </thead>
              <tbody>
                {recordings.map((recording, index) => (
                  <tr key={index} className="border-t border-dark-700">
                    <td className="py-3 font-mono text-sm">
                      {formatTime(recording.timestamp)}
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
              <div className="flex items-center justify-center h-60 text-gray-500">
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
            className="bg-dark-700 hover:bg-dark-600 disabled:bg-dark-700 disabled:opacity-50 text-white px-8 py-4 rounded-2xl text-lg transition-colors"
          >
            Undo
          </button>
          
          <button
            onClick={handleSave}
            disabled={recordings.length === 0}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-dark-700 disabled:opacity-50 text-white px-8 py-4 rounded-2xl text-lg transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;