import React from 'react';

interface AngleDisplayProps {
  label: string;
  value: number;
  unit: string;
}

const AngleDisplay: React.FC<AngleDisplayProps> = ({ label, value, unit }) => {
  // Determine the axis icon
  const getAxisIcon = () => {
    switch (label.toLowerCase()) {
      case 'pitch':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 11l5-5m0 0l5 5m-5-5v12" />
          </svg>
        );
      case 'roll':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        );
      case 'yaw':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        );
      default:
        return null;
    }
  };

  // Determine if the angle is significant
  const isSignificant = Math.abs(value) > 5;
  
  // Format the value with sign
  const formattedValue = value >= 0 ? `+${value.toFixed(1)}` : value.toFixed(1);

  return (
    <div className="bg-white rounded-2xl shadow-apple p-6 transition-all hover:shadow-apple-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className={`text-apple-gray-400 ${isSignificant ? 'text-apple-green' : ''}`}>
            {getAxisIcon()}
          </div>
          <h3 className="text-headline text-apple-gray-600">{label}</h3>
        </div>
        {isSignificant && (
          <div className="w-2 h-2 rounded-full bg-apple-green animate-pulse"></div>
        )}
      </div>

      {/* Value Display */}
      <div className="flex items-baseline">
        <span className={`text-display tabular-nums ${isSignificant ? 'text-apple-gray-900' : 'text-apple-gray-400'}`}>
          {formattedValue}
        </span>
        <span className="text-title2 text-apple-gray-400 ml-1">{unit}</span>
      </div>

      {/* Visual Indicator */}
      <div className="mt-4">
        <div className="h-1 bg-apple-gray-100 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-300 ${
              isSignificant ? 'bg-apple-green' : 'bg-apple-gray-300'
            }`}
            style={{ 
              width: `${Math.min(Math.abs(value) / 90 * 100, 100)}%`,
              marginLeft: value < 0 ? 'auto' : '0'
            }}
          />
        </div>
      </div>

      {/* Range Indicator */}
      <div className="mt-2 flex justify-between text-caption text-apple-gray-400">
        <span>-90°</span>
        <span>0°</span>
        <span>+90°</span>
      </div>
    </div>
  );
};

export default AngleDisplay;