import React from 'react';

interface CurrencyDisplayProps {
  totalCopper: number;
}

export default function CurrencyDisplay({ totalCopper }: CurrencyDisplayProps) {
  const gold = Math.floor(totalCopper / 10000);
  const silver = Math.floor((totalCopper % 10000) / 100);
  const copper = totalCopper % 100;

  return (
    <div className="flex items-center justify-end space-x-1 text-sm">
      {gold > 0 && (
        <span className="text-yellow-500">
          {gold}
          <span className="text-xs ml-0.5">g</span>
        </span>
      )}
      {(silver > 0 || gold > 0) && (
        <span className="text-gray-400">
          {String(silver).padStart(2, '0')}
          <span className="text-xs ml-0.5">s</span>
        </span>
      )}
      <span className="text-orange-400">
        {String(copper).padStart(2, '0')}
        <span className="text-xs ml-0.5">c</span>
      </span>
    </div>
  );
} 