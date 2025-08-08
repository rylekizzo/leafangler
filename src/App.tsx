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
      // eslint-disable-next-line react-hooks/exhaustive-deps
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
      <div className="min-h-screen bg-apple-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <div className="mb-6">
            <div className="w-16 h-16 mx-auto bg-apple-gray-200 rounded-2xl flex items-center justify-center">
              <svg className="w-8 h-8 text-apple-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
          <h1 className="text-title2 text-apple-gray-900 mb-2">
            Sensor Access Required
          </h1>
          <p className="text-body text-apple-gray-500 mb-6">
            To measure leaf angles, please use a mobile device with orientation sensors and grant permission when prompted.
          </p>
          <div className="text-footnote text-apple-gray-400">
            HTTPS connection required for sensor access
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-apple-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-apple-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-apple-green rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                </svg>
              </div>
              <h1 className="text-title3 text-apple-gray-900">LeafAngler</h1>
            </div>
            <div className="text-caption text-apple-gray-400">
              Professional Angle Measurement
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Angle Display Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <AngleDisplay label="Pitch" value={angles.pitch} unit="°" />
          <AngleDisplay label="Roll" value={angles.roll} unit="°" />
          <AngleDisplay label="Yaw" value={angles.yaw} unit="°" />
        </div>

        {/* Control Panel */}
        <div className="bg-white rounded-2xl shadow-apple p-6 mb-8">
          <div className="flex flex-wrap gap-3 justify-center">
            {!isListening ? (
              <button
                onClick={handleStart}
                className="px-6 py-3 bg-apple-green text-white rounded-xl font-medium 
                         hover:bg-opacity-90 transition-all active:scale-95"
              >
                Start Measuring
              </button>
            ) : (
              <button
                onClick={handleStop}
                className="px-6 py-3 bg-apple-gray-200 text-apple-gray-900 rounded-xl font-medium 
                         hover:bg-apple-gray-300 transition-all active:scale-95"
              >
                Stop
              </button>
            )}

            <button
              onClick={handleCalibrate}
              className="px-6 py-3 bg-white text-apple-gray-900 rounded-xl font-medium 
                       border border-apple-gray-200 hover:bg-apple-gray-50 transition-all active:scale-95"
            >
              Calibrate
            </button>

            {isListening && (
              <>
                <button
                  onClick={handleFreeze}
                  className={`px-6 py-3 rounded-xl font-medium transition-all active:scale-95
                           ${isFrozen 
                             ? 'bg-orange-500 text-white hover:bg-opacity-90' 
                             : 'bg-white text-apple-gray-900 border border-apple-gray-200 hover:bg-apple-gray-50'
                           }`}
                >
                  {isFrozen ? 'Unfreeze' : 'Freeze'}
                </button>

                <button
                  onClick={handleRecord}
                  className="px-6 py-3 bg-white text-apple-gray-900 rounded-xl font-medium 
                           border border-apple-gray-200 hover:bg-apple-gray-50 transition-all active:scale-95"
                >
                  Record
                </button>
              </>
            )}
          </div>

          {/* Status Indicator */}
          {isListening && (
            <div className="mt-6 flex items-center justify-center">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${isFrozen ? 'bg-orange-500' : 'bg-apple-green animate-pulse'}`}></div>
                <span className="text-footnote text-apple-gray-500">
                  {isFrozen ? 'Measurement Frozen' : 'Measuring...'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Recordings */}
        {recordings.length > 0 && (
          <RecordingPanel
            recordings={recordings}
            onClear={handleClearRecordings}
            onExport={handleExportRecordings}
          />
        )}

        {/* Instructions */}
        <div className="bg-white rounded-2xl shadow-apple-sm p-6">
          <h3 className="text-headline text-apple-gray-900 mb-4">How to Use</h3>
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 rounded-full bg-apple-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-caption text-apple-gray-600">1</span>
              </div>
              <p className="text-subhead text-apple-gray-600">
                Place your device on a flat surface and tap Calibrate to zero the sensors
              </p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 rounded-full bg-apple-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-caption text-apple-gray-600">2</span>
              </div>
              <p className="text-subhead text-apple-gray-600">
                Position your device flat against the leaf surface
              </p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 rounded-full bg-apple-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-caption text-apple-gray-600">3</span>
              </div>
              <p className="text-subhead text-apple-gray-600">
                Tap Start Measuring to begin real-time angle measurement
              </p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 rounded-full bg-apple-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-caption text-apple-gray-600">4</span>
              </div>
              <p className="text-subhead text-apple-gray-600">
                Use Freeze to lock measurements and Record to save data points
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;