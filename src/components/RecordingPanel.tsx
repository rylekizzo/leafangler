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
    <div className="bg-white rounded-2xl shadow-apple p-6 mb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-title3 text-apple-gray-900">Recordings</h2>
          <p className="text-footnote text-apple-gray-500 mt-1">
            {recordings.length} measurement{recordings.length !== 1 ? 's' : ''} recorded
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onClear}
            className="px-4 py-2 text-apple-gray-600 rounded-lg hover:bg-apple-gray-50 transition-all text-subhead"
          >
            Clear
          </button>
          <button
            onClick={onExport}
            className="px-4 py-2 bg-apple-green text-white rounded-lg hover:bg-opacity-90 transition-all text-subhead font-medium"
          >
            Export
          </button>
        </div>
      </div>
      
      {/* Average Display */}
      {recordings.length > 0 && (
        <div className="bg-apple-gray-50 rounded-xl p-4 mb-4">
          <div className="text-caption text-apple-gray-500 mb-2">Average Values</div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-caption text-apple-gray-400">Pitch</div>
              <div className="text-headline text-apple-gray-900">
                {average.pitch >= 0 ? '+' : ''}{average.pitch.toFixed(1)}°
              </div>
            </div>
            <div>
              <div className="text-caption text-apple-gray-400">Roll</div>
              <div className="text-headline text-apple-gray-900">
                {average.roll >= 0 ? '+' : ''}{average.roll.toFixed(1)}°
              </div>
            </div>
            <div>
              <div className="text-caption text-apple-gray-400">Yaw</div>
              <div className="text-headline text-apple-gray-900">
                {average.yaw >= 0 ? '+' : ''}{average.yaw.toFixed(1)}°
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Recordings Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-apple-gray-200">
              <th className="text-left py-2 text-caption text-apple-gray-500 font-medium">Time</th>
              <th className="text-right py-2 text-caption text-apple-gray-500 font-medium">Pitch</th>
              <th className="text-right py-2 text-caption text-apple-gray-500 font-medium">Roll</th>
              <th className="text-right py-2 text-caption text-apple-gray-500 font-medium">Yaw</th>
            </tr>
          </thead>
          <tbody>
            {recordings.map((rec, index) => (
              <tr key={index} className="border-b border-apple-gray-100">
                <td className="py-3 text-subhead text-apple-gray-600">
                  {formatTime(rec.timestamp)}
                </td>
                <td className="py-3 text-right text-subhead text-apple-gray-900 tabular-nums">
                  {rec.angles.pitch >= 0 ? '+' : ''}{rec.angles.pitch.toFixed(1)}°
                </td>
                <td className="py-3 text-right text-subhead text-apple-gray-900 tabular-nums">
                  {rec.angles.roll >= 0 ? '+' : ''}{rec.angles.roll.toFixed(1)}°
                </td>
                <td className="py-3 text-right text-subhead text-apple-gray-900 tabular-nums">
                  {rec.angles.yaw >= 0 ? '+' : ''}{rec.angles.yaw.toFixed(1)}°
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RecordingPanel;