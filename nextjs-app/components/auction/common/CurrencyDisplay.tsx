import React from 'react';
import { Currency } from '@/lib/types/auction';

interface CurrencyDisplayProps {
  totalCopper: number;
  className?: string;
}

const COPPER_PER_SILVER = 100;
const SILVER_PER_GOLD = 100;

export function formatCurrency(totalCopper: number): Currency {
  const gold = Math.floor(totalCopper / (COPPER_PER_SILVER * SILVER_PER_GOLD));
  const silver = Math.floor((totalCopper % (COPPER_PER_SILVER * SILVER_PER_GOLD)) / COPPER_PER_SILVER);
  const copper = totalCopper % COPPER_PER_SILVER;
  return { gold, silver, copper };
}

export default function CurrencyDisplay({ totalCopper, className }: CurrencyDisplayProps) {
  const { gold, silver, copper } = formatCurrency(totalCopper);

  return (
    <span className={`inline-flex items-center space-x-1 ${className || ''}`}>
      {gold > 0 && (
        <span className="text-yellow-500">
          {gold}
          <span className="text-xs ml-0.5">G</span> {/* 골드 아이콘 대체 */}
        </span>
      )}
      {silver > 0 && (
        <span className="text-gray-500">
          {silver}
          <span className="text-xs ml-0.5">S</span> {/* 실버 아이콘 대체 */}
        </span>
      )}
      {(copper > 0 || (gold === 0 && silver === 0)) && (
        <span className="text-orange-600">
          {copper}
          <span className="text-xs ml-0.5">C</span> {/* 코퍼 아이콘 대체 */}
        </span>
      )}
    </span>
  );
} 