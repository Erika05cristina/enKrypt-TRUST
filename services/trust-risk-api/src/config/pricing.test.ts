import { describe, expect, it } from 'vitest';
import { usdPriceToUsdcBaseUnits } from './pricing.js';

describe('usdPriceToUsdcBaseUnits', () => {
  it('converts $0.001 to 1000', () => {
    expect(usdPriceToUsdcBaseUnits('$0.001')).toBe(1000n);
  });
  it('converts 0.02 to 20000', () => {
    expect(usdPriceToUsdcBaseUnits('0.02')).toBe(20000n);
  });
  it('handles $0.01', () => {
    expect(usdPriceToUsdcBaseUnits('$0.01')).toBe(10000n);
  });
});
