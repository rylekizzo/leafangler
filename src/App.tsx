import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import { SensorService, Angles } from './services/sensorService';
import AngleDisplay from './components/AngleDisplay';
import RecordingPanel from './components/RecordingPanel';
import logo from './logo.png';

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
      <div className="min-h-screen bg-gradient-radial flex items-center justify-center p-4">
        <div className="backdrop-blur-md bg-white/10 rounded-2xl shadow-2xl p-8 max-w-md text-center border border-white/20">
          <div className="mb-4">
            <img src={logo} alt="LeafAngler" className="w-24 h-24 mx-auto opacity-50" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-4">
            Sensor Access Required
          </h1>
          <p className="text-white/80 mb-4">
            This app requires device orientation sensors to measure leaf angles.
          </p>
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 text-left text-sm text-white/70">
            <p className="mb-2">📱 Use a mobile device with gyroscope</p>
            <p className="mb-2">🔒 Access via HTTPS (required for sensors)</p>
            <p>✅ Grant sensor permissions when prompted</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-radial overflow-hidden relative">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-leaf-light rounded-full opacity-20 blur-3xl animate-pulse-slow"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-leaf-main rounded-full opacity-20 blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-accent rounded-full opacity-10 blur-3xl animate-float"></div>
      </div>

      <div className="container mx-auto px-4 py-6 relative z-10">
        <header className="text-center mb-8 animate-fade-in">
          <div className="flex items-center justify-center mb-4">
            <img src={logo} alt="LeafAngler" className="w-20 h-20 animate-float drop-shadow-2xl" />
          </div>
          <h1 className="text-5xl font-bold text-white mb-2 drop-shadow-lg">
            LeafAngler
          </h1>
          <p className="text-white/80 text-lg">
            Professional Leaf Angle Measurement
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <AngleDisplay label="Pitch" value={angles.pitch} unit="°" />
          <AngleDisplay label="Roll" value={angles.roll} unit="°" />
          <AngleDisplay label="Yaw" value={angles.yaw} unit="°" />
        </div>

        {/* Control Panel */}
        <div className="backdrop-blur-md bg-white/10 rounded-2xl p-6 mb-8 border border-white/20 shadow-2xl animate-slide-in">
          <div className="flex flex-wrap gap-4 justify-center">
            {!isListening ? (
              <button
                onClick={handleStart}
                className="group relative px-8 py-4 bg-gradient-to-r from-leaf-light to-leaf-main text-white rounded-xl font-semibold 
                         shadow-lg transform transition-all duration-300 hover:scale-105 hover:shadow-2xl
                         overflow-hidden"
              >
                <span className="relative z-10 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Start Measuring
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-leaf-main to-leaf-dark transform translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
              </button>
            ) : (
              <button
                onClick={handleStop}
                className="group relative px-8 py-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-semibold 
                         shadow-lg transform transition-all duration-300 hover:scale-105 hover:shadow-2xl
                         overflow-hidden"
              >
                <span className="relative z-10 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10h6v4H9z" />
                  </svg>
                  Stop Measuring
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-red-700 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
              </button>
            )}

            <button
              onClick={handleCalibrate}
              className="px-8 py-4 backdrop-blur-md bg-white/20 text-white rounded-xl font-semibold 
                       border border-white/30 shadow-lg transform transition-all duration-300 
                       hover:scale-105 hover:bg-white/30 hover:shadow-2xl"
            >
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                Calibrate
              </span>
            </button>

            {isListening && (
              <button
                onClick={handleFreeze}
                className={`px-8 py-4 backdrop-blur-md ${isFrozen ? 'bg-orange-500/30' : 'bg-purple-500/30'} 
                         text-white rounded-xl font-semibold border border-white/30 shadow-lg 
                         transform transition-all duration-300 hover:scale-105 hover:shadow-2xl`}
              >
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {isFrozen ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6" />
                    )}
                  </svg>
                  {isFrozen ? 'Unfreeze' : 'Freeze'}
                </span>
              </button>
            )}

            {isListening && (
              <button
                onClick={handleRecord}
                className="px-8 py-4 backdrop-blur-md bg-indigo-500/30 text-white rounded-xl font-semibold 
                         border border-white/30 shadow-lg transform transition-all duration-300 
                         hover:scale-105 hover:bg-indigo-500/40 hover:shadow-2xl"
              >
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Record
                </span>
              </button>
            )}
          </div>
        </div>

        {recordings.length > 0 && (
          <RecordingPanel
            recordings={recordings}
            onClear={handleClearRecordings}
            onExport={handleExportRecordings}
          />
        )}

        {/* Tips Section */}
        <div className="mt-8 backdrop-blur-md bg-white/10 rounded-2xl p-6 border border-white/20 shadow-xl">
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Pro Tips
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-white/80">
            <div className="flex items-start gap-2">
              <span className="text-leaf-light mt-1">◆</span>
              <span>Calibrate on a flat surface before measuring</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-leaf-light mt-1">◆</span>
              <span>Place device flat on the leaf surface</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-leaf-light mt-1">◆</span>
              <span>Use freeze to lock the current measurement</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-leaf-light mt-1">◆</span>
              <span>Record multiple measurements for accuracy</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
