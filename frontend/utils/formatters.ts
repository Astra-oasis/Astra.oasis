export const formatMarketCap = (value: any): string => {
  const numValue = typeof value === 'string' ? parseFloat(value) : Number(value) || 0;
  let formatted = '';
  if (numValue >= 1_000_000_000_000) {
    formatted = `$${(numValue / 1_000_000_000_000).toFixed(1)}T`;
  } else if (numValue >= 1_000_000_000) {
    formatted = `$${(numValue / 1_000_000_000).toFixed(1)}B`;
  } else if (numValue >= 1_000_000) {
    formatted = `$${(numValue / 1_000_000).toFixed(1)}M`;
  } else if (numValue >= 1_000) {
    formatted = `$${(numValue / 1_000).toFixed(1)}K`;
  } else {
    formatted = `$${numValue.toFixed(0)}`;
  }
  return formatted;
};

export const formatVolume = (value: any): string => {
  const numValue = typeof value === 'string' ? parseFloat(value) : Number(value) || 0;
  if (numValue >= 1_000_000_000_000) {
    return `$${(numValue / 1_000_000_000_000).toFixed(1)}T`;
  } else if (numValue >= 1_000_000_000) {
    return `$${(numValue / 1_000_000_000).toFixed(1)}B`;
  } else if (numValue >= 1_000_000) {
    return `$${(numValue / 1_000_000).toFixed(1)}M`;
  } else if (numValue >= 1_000) {
    return `$${(numValue / 1_000).toFixed(1)}K`;
  } else {
    return `$${numValue.toFixed(2)}`;
  }
};

export const formatPriceChange = (value: any): string => {
  const numValue = typeof value === 'string' ? parseFloat(value) : Number(value) || 0;
  const sign = numValue >= 0 ? '+' : '';
  return `${sign}${numValue.toFixed(2)}%`;
};

export const formatPriceChangeColor = (value: any): string => {
  const numValue = typeof value === 'string' ? parseFloat(value) : Number(value) || 0;
  return numValue >= 0 ? 'text-pump-green' : 'text-pump-red';
};

export const formatTraderCount = (value: any): string => {
  const numValue = typeof value === 'string' ? parseInt(value) : Number(value) || 0;
  if (numValue >= 1_000_000) {
    return `${(numValue / 1_000_000).toFixed(1)}M`;
  } else if (numValue >= 1_000) {
    return `${(numValue / 1_000).toFixed(1)}K`;
  } else {
    return `${numValue}`;
  }
};
