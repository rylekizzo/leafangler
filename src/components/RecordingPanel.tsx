import React from 'react';
import { Angles } from '../services/sensorService';

interface Recording {
  timestamp: Date;
  angles: Angles;
}

interface RecordingPanelProps {
  recordings: Recording[];
  onClear: () => void;
  onExport: () => void;
}

const RecordingPanel: React.FC<RecordingPanelProps> = ({ recordings, onClear, onExport }) => {
  const calculateAverage = () => {
    if (recordings.length === 0) return { pitch: 0, roll: 0, yaw: 0 };
    
    const sum = recordings.reduce(
      (acc, rec) => ({
        pitch: acc.pitch + rec.angles.pitch,
        roll: acc.roll + rec.angles.roll,
        yaw: acc.yaw + rec.angles.yaw,
      }),
      { pitch: 0, roll: 0, yaw: 0 }
    );
    
    return {
      pitch: sum.pitch / recordings.length,
      roll: sum.roll / recordings.length,
      yaw: sum.yaw / recordings.length,
    };
  };

  const formatTime = (date: Date) => {
    return date.toTimeString().split(' ')[0]; // HH:MM:SS format
  };

  const average = calculateAverage();

  return (
    <div className="backdrop-blur-md bg-white/10 rounded-2xl p-6 border border-white/20 shadow-2xl animate-fade-in">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          {recordings.length} Recordings
        </h2>
        <div className="flex gap-2">
          <button
            onClick={onClear}
            className="px-4 py-2 backdrop-blur-md bg-red-500/20 text-white rounded-lg border border-red-500/30 hover:bg-red-500/30 transition-all"
          >
            Clear All
          </button>
          <button
            onClick={onExport}
            className="px-4 py-2 backdrop-blur-md bg-leaf-main/20 text-white rounded-lg border border-leaf-main/30 hover:bg-leaf-main/30 transition-all"
          >
            Export JSON
          </button>
        </div>
      </div>
      
      {recordings.length > 0 && (
        <div className="mb-4 p-3 backdrop-blur-md bg-white/10 rounded-lg border border-white/20">
          <span className="font-semibold text-white/80">Average: </span>
          <span className="text-leaf-light ml-2">P: {average.pitch.toFixed(1)}°</span>
          <span className="text-leaf-main ml-3">R: {average.roll.toFixed(1)}°</span>
          <span className="text-leaf-dark ml-3">Y: {average.yaw.toFixed(1)}°</span>
        </div>
      )}
      
      <div className="max-h-60 overflow-y-auto rounded-lg">
        <table className="w-full text-sm text-white/90">
          <thead className="text-left border-b border-white/20">
            <tr>
              <th className="pb-2 pl-2">Time</th>
              <th className="pb-2 text-leaf-light">Pitch</th>
              <th className="pb-2 text-leaf-main">Roll</th>
              <th className="pb-2 text-leaf-dark">Yaw</th>
            </tr>
          </thead>
          <tbody>
            {recordings.map((rec, index) => (
              <tr key={index} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                <td className="py-2 pl-2">{formatTime(rec.timestamp)}</td>
                <td className="py-2">{rec.angles.pitch.toFixed(1)}°</td>
                <td className="py-2">{rec.angles.roll.toFixed(1)}°</td>
                <td className="py-2">{rec.angles.yaw.toFixed(1)}°</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RecordingPanel;