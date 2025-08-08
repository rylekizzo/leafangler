import React from 'react';

interface AngleDisplayProps {
  label: string;
  value: number;
  unit: string;
}

const AngleDisplay: React.FC<AngleDisplayProps> = ({ label, value, unit }) => {
  const getGradientClass = () => {
    switch (label.toLowerCase()) {
      case 'pitch':
        return 'from-leaf-light/20 to-leaf-main/20 border-leaf-light/40';
      case 'roll':
        return 'from-leaf-main/20 to-leaf-dark/20 border-leaf-main/40';
      case 'yaw':
        return 'from-leaf-dark/20 to-protractor/20 border-leaf-dark/40';
      default:
        return 'from-gray-200/20 to-gray-400/20 border-gray-300/40';
    }
  };

  const getIconColor = () => {
    switch (label.toLowerCase()) {
      case 'pitch':
        return 'text-leaf-light';
      case 'roll':
        return 'text-leaf-main';
      case 'yaw':
        return 'text-leaf-dark';
      default:
        return 'text-gray-400';
    }
  };

  const getIcon = () => {
    switch (label.toLowerCase()) {
      case 'pitch':
        return '↕';
      case 'roll':
        return '↔';
      case 'yaw':
        return '↻';
      default:
        return '•';
    }
  };

  // Determine if angle is significantly tilted for visual feedback
  const isActive = Math.abs(value) > 5;

  return (
    <div className={`
      relative backdrop-blur-md bg-gradient-to-br ${getGradientClass()} 
      rounded-2xl p-6 border border-white/20
      shadow-2xl transform transition-all duration-300 hover:scale-105
      ${isActive ? 'animate-pulse-slow' : ''}
    `}>
      {/* Decorative corner accent */}
      <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-white/10 to-transparent rounded-bl-full"></div>
      
      <div className="relative z-10 flex flex-col items-center">
        {/* Icon and Label */}
        <div className="flex items-center gap-2 mb-3">
          <span className={`text-3xl ${getIconColor()}`}>{getIcon()}</span>
          <h3 className="text-lg font-semibold text-white/90 uppercase tracking-wider">
            {label}
          </h3>
        </div>
        
        {/* Value Display */}
        <div className="relative">
          <div className="flex items-baseline justify-center">
            <span className={`text-5xl font-bold text-white ${isActive ? 'drop-shadow-glow' : ''}`}>
              {value >= 0 ? '+' : ''}{value.toFixed(1)}
            </span>
            <span className="text-2xl ml-1 text-white/70">
              {unit}
            </span>
          </div>
          
          {/* Visual indicator bar */}
          <div className="mt-3 w-32 h-2 bg-black/20 rounded-full overflow-hidden">
            <div 
              className={`h-full bg-gradient-to-r ${getGradientClass().replace('/20', '')} transition-all duration-300`}
              style={{ 
                width: `${Math.min(Math.abs(value) / 90 * 100, 100)}%`,
                marginLeft: value < 0 ? 'auto' : '0'
              }}
            ></div>
          </div>
        </div>
        
        {/* Status indicator */}
        <div className={`mt-3 text-xs text-white/60 ${isActive ? 'visible' : 'invisible'}`}>
          {Math.abs(value) > 45 ? 'High Tilt' : 'Active'}
        </div>
      </div>
    </div>
  );
};

export default AngleDisplay;