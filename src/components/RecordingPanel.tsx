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
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800">
          📊 {recordings.length} Recordings
        </h2>
        <div className="flex gap-2">
          <button
            onClick={onClear}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
          >
            Clear All
          </button>
          <button
            onClick={onExport}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Export JSON
          </button>
        </div>
      </div>
      
      {recordings.length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 rounded">
          <span className="font-semibold text-gray-700">Average: </span>
          <span className="text-blue-600">P: {average.pitch.toFixed(1)}°</span>
          <span className="text-green-600 ml-3">R: {average.roll.toFixed(1)}°</span>
          <span className="text-purple-600 ml-3">Y: {average.yaw.toFixed(1)}°</span>
        </div>
      )}
      
      <div className="max-h-60 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="text-left border-b">
            <tr>
              <th className="pb-2">Time</th>
              <th className="pb-2 text-blue-600">Pitch</th>
              <th className="pb-2 text-green-600">Roll</th>
              <th className="pb-2 text-purple-600">Yaw</th>
            </tr>
          </thead>
          <tbody>
            {recordings.map((rec, index) => (
              <tr key={index} className="border-b">
                <td className="py-2">{formatTime(rec.timestamp)}</td>
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