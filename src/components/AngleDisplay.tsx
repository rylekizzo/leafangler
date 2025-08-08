import React from 'react';

interface AngleDisplayProps {
  label: string;
  value: number;
  unit: string;
}

const AngleDisplay: React.FC<AngleDisplayProps> = ({ label, value, unit }) => {
  const getColorClass = () => {
    switch (label.toLowerCase()) {
      case 'pitch':
        return 'text-blue-600';
      case 'roll':
        return 'text-green-600';
      case 'yaw':
        return 'text-purple-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 flex flex-col items-center">
      <h3 className={`text-lg font-semibold mb-2 ${getColorClass()}`}>
        {label}
      </h3>
      <div className="flex items-baseline">
        <span className="text-4xl font-bold">
          {value.toFixed(1)}
        </span>
        <span className="text-xl ml-1 text-gray-500">
          {unit}
        </span>
      </div>
    </div>
  );
};

export default AngleDisplay;