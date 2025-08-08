import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import { SensorService, Angles } from './services/sensorService';
import AngleDisplay from './components/AngleDisplay';
import RecordingPanel from './components/RecordingPanel';

function App() {
  const [angles, setAngles] = useState<Angles>({ pitch: 0, roll: 0, yaw: 0 });
  const [isListening, setIsListening] = useState(false);
  const [isFrozen, setIsFrozen] = useState(false);
  const [sensorsAvailable, setSensorsAvailable] = useState(true);
  const [recordings, setRecordings] = useState<Array<{ timestamp: Date; angles: Angles }>>([]);
  
  const sensorService = useRef<SensorService>(new SensorService());
  const unsubscribe = useRef<(() => void) | null>(null);
  const frozenAngles = useRef<Angles>({ pitch: 0, roll: 0, yaw: 0 });

  useEffect(() => {
    setSensorsAvailable(sensorService.current.areSensorsAvailable());
    
    return () => {
      if (unsubscribe.current) {
        unsubscribe.current();
      }
      sensorService.current.stopListening();
    };
  }, []);

  const handleStart = () => {
    setIsListening(true);
    sensorService.current.startListening();
    
    unsubscribe.current = sensorService.current.subscribe((newAngles) => {
      if (!isFrozen) {
        setAngles(newAngles);
      }
    });
  };

  const handleStop = () => {
    setIsListening(false);
    if (unsubscribe.current) {
      unsubscribe.current();
      unsubscribe.current = null;
    }
    sensorService.current.stopListening();
  };

  const handleCalibrate = () => {
    sensorService.current.calibrate();
  };

  const handleFreeze = () => {
    if (isFrozen) {
      setIsFrozen(false);
    } else {
      frozenAngles.current = angles;
      setIsFrozen(true);
    }
  };

  const handleRecord = () => {
    setRecordings([...recordings, { timestamp: new Date(), angles }]);
  };

  const handleClearRecordings = () => {
    setRecordings([]);
  };

  const handleExportRecordings = () => {
    const data = recordings.map(r => ({
      timestamp: r.timestamp.toISOString(),
      pitch: r.angles.pitch,
      roll: r.angles.roll,
      yaw: r.angles.yaw
    }));
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leaf-angles-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!sensorsAvailable) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            ⚠️ Sensor Access Not Available
          </h1>
          <p className="text-gray-700 mb-4">
            This app requires device orientation sensors to measure angles.
          </p>
          <p className="text-sm text-gray-600">
            Please ensure you're using a mobile device with gyroscope support
            and that you've granted sensor permissions. HTTPS is required for sensor access.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            🍃 Leaf Angle Measurement
          </h1>
          <p className="text-gray-600">
            Place your device on a leaf to measure its orientation
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <AngleDisplay label="Pitch" value={angles.pitch} unit="°" />
          <AngleDisplay label="Roll" value={angles.roll} unit="°" />
          <AngleDisplay label="Yaw" value={angles.yaw} unit="°" />
        </div>

        <div className="flex flex-wrap gap-4 justify-center mb-8">
          {!isListening ? (
            <button
              onClick={handleStart}
              className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
            >
              Start Measuring
            </button>
          ) : (
            <button
              onClick={handleStop}
              className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
            >
              Stop Measuring
            </button>
          )}

          <button
            onClick={handleCalibrate}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Calibrate
          </button>

          {isListening && (
            <button
              onClick={handleFreeze}
              className={`px-6 py-3 ${isFrozen ? 'bg-orange-600 hover:bg-orange-700' : 'bg-purple-600 hover:bg-purple-700'} text-white rounded-lg font-semibold transition-colors`}
            >
              {isFrozen ? 'Unfreeze' : 'Freeze'}
            </button>
          )}

          {isListening && (
            <button
              onClick={handleRecord}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
            >
              Record Measurement
            </button>
          )}
        </div>

        {recordings.length > 0 && (
          <RecordingPanel
            recordings={recordings}
            onClear={handleClearRecordings}
            onExport={handleExportRecordings}
          />
        )}

        <div className="mt-8 text-center text-sm text-gray-600">
          <p>Tips:</p>
          <ul className="mt-2 space-y-1">
            <li>• Calibrate on a flat surface before measuring</li>
            <li>• Place device flat on the leaf surface</li>
            <li>• Use freeze to lock the current measurement</li>
            <li>• Record multiple measurements for accuracy</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default App;
