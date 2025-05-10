import React from 'react';

interface CurrencyConverterProps {
  copper: number;
}

const CurrencyConverter: React.FC<CurrencyConverterProps> = ({ copper }) => {
  const gold = Math.floor(copper / 10000);
  const silver = Math.floor((copper % 10000) / 100);
  const remainingCopper = copper % 100;

  return (
    <span>
      {gold > 0 && `${gold}g `}
      {silver > 0 && `${silver}s `}
      {remainingCopper > 0 && `${remainingCopper}c`}
    </span>
  );
};

export default CurrencyConverter;
