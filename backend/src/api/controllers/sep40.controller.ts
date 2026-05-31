import prisma from '../../lib/prisma';
import logger from '../../utils/logger';

/**
 * SEP-40 Swap Rates Interface
 * Provides standardized way for wallets to request real-time swap rates
 * for on-chain asset pairs managed by the anchor.
 */

// Simple in-memory cache for swap rates (5 minute TTL)
const CACHE_TTL_MS = 5 * 60 * 1000;
const swapRateCache = new Map<string, { rate: SwapRate; timestamp: number }>();

interface AssetPair {
  sell_asset: string;
  buy_asset: string;
}

interface SwapRate {
  sell_asset: string;
  buy_asset: string;
  rate: number;
  decimals: number;
}

interface SwapRateResponse {
  rates: SwapRate[];
  errors?: { pair: string; reason: string }[];
}

/**
 * Mock swap rate data - in production, this would come from
 * real market data or pricing APIs
 */
const MOCK_SWAP_RATES: Record<string, Record<string, number>> = {
  'XLM': {
    'USDC': 0.12,
    'USDT': 0.12,
    'BTC': 0.0000027,
    'ETH': 0.000048,
  },
  'USDC': {
    'XLM': 8.33,
    'USDT': 1.0,
    'BTC': 0.000022,
    'ETH': 0.0004,
  },
  'USDT': {
    'XLM': 8.33,
    'USDC': 1.0,
    'BTC': 0.000022,
    'ETH': 0.0004,
  },
  'BTC': {
    'XLM': 370370,
    'USDC': 45000,
    'USDT': 45000,
    'ETH': 18.5,
  },
  'ETH': {
    'XLM': 20000,
    'USDC': 2500,
    'USDT': 2500,
    'BTC': 0.054,
  },
};

class Sep40Controller {
  // Simple in-memory cache for swap rates (5 minute TTL)
  private readonly CACHE_TTL_MS = 5 * 60 * 1000;
  private readonly swapRateCache = new Map<string, { rate: SwapRate; timestamp: number }>();

  /**
  /**
   * Get swap rates for specified asset pairs
   * @param pairs Array of asset pairs to get rates for
   * @returns Array of swap rates
   */
  async getSwapRates(pairs: AssetPair[]): Promise<SwapRateResponse> {
    const rates: SwapRate[] = [];
    const errors: { pair: string; reason: string }[] = [];

    for (const pair of pairs) {
      try {
        // Validate pair structure
        if (!pair.sell_asset || !pair.buy_asset) {
          errors.push({
            pair: `${pair.sell_asset || 'null'}/${pair.buy_asset || 'null'}`,
            reason: 'Missing sell_asset or buy_asset property'
          });
          continue;
        }

    const invalidPairs: string[] = [];

    for (const pair of pairs) {
      try {
        const rate = await this.getSwapRate(pair.sell_asset, pair.buy_asset);
        if (rate) {
          rates.push(rate);
        } else {
          errors.push({
            pair: `${pair.sell_asset}/${pair.buy_asset}`,
            reason: 'Unsupported asset pair or invalid rate calculation'
          });
        }
      } catch (error) {
        errors.push({
          pair: `${pair.sell_asset}/${pair.buy_asset}`,
          reason: error instanceof Error ? error.message : 'Unknown error occurred'
        });
      }
    }

    return { 
      rates, 
      errors: errors.length > 0 ? errors : undefined 
    };
          invalidPairs.push(`${pair.sell_asset}/${pair.buy_asset}`);
        }
      } catch (error) {
        logger.error('Error getting swap rate for pair', { 
          pair, 
          error: error instanceof Error ? error.message : 'unknown error' 
        });
        invalidPairs.push(`${pair.sell_asset}/${pair.buy_asset}`);
      }
    }

    // Log warnings for invalid pairs
    if (invalidPairs.length > 0) {
      logger.warn('Some asset pairs could not be resolved', { invalidPairs });
    }

    return { rates };
  }

  /**
   * Get swap rate for a single asset pair
   * @param sellAsset Asset code to sell
   * @param buyAsset Asset code to buy
   * @returns Swap rate or null if not available
   */
  private normalizeAssetCode(assetCode: string): string | null {
    if (!assetCode || typeof assetCode !== 'string') {
      return null;
    }
    
    // Trim whitespace and convert to uppercase
    let normalized = assetCode.trim().toUpperCase();
    
    // Remove any non-alphanumeric characters (except underscores)
    normalized = normalized.replace(/[^A-Z0-9_]/g, '');
    
    // Validate that it's not empty after cleaning
    if (!normalized) {
      return null;
    }
    
    return normalized;
  }

  private async getSwapRate(sellAsset: string, buyAsset: string): Promise<SwapRate | null> {
    const sellCode = this.normalizeAssetCode(sellAsset);
    const buyCode = this.normalizeAssetCode(buyAsset);
    
    if (!sellCode || !buyCode) {
      return null;
    }
    
    const cacheKey = `${sellCode}/${buyCode}`;

    // Check cache first
    const cached = this.swapRateCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
    const sellCode = sellAsset.toUpperCase();
    const buyCode = buyAsset.toUpperCase();
    const cacheKey = `${sellCode}/${buyCode}`;

    // Check cache first
    const cached = swapRateCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.rate;
    }

    // Validate asset codes
    if (!sellCode || !buyCode || sellCode === buyCode) {
      return null;
    }

    // Get rate from mock data or calculate inverse
    let rate = MOCK_SWAP_RATES[sellCode]?.[buyCode];

    if (!rate) {
      // Try to calculate inverse rate
      const inverseRate = MOCK_SWAP_RATES[buyCode]?.[sellCode];
      if (inverseRate) {
        rate = 1 / inverseRate;
      } else {
        return null;
      }
    }

    // Calculate appropriate decimal precision based on rate magnitude
    let decimals = 7;
    if (rate < 0.001) {
      decimals = 10;
    } else if (rate < 0.01) {
      decimals = 9;
    } else if (rate < 0.1) {
      decimals = 8;
    } else if (rate >= 1000) {
      decimals = 2;
    } else if (rate >= 100) {
      decimals = 3;
    } else if (rate >= 10) {
      decimals = 4;
    }
    
    // Validate rate is reasonable (prevent extreme values)
    if (rate <= 0 || rate > 1000000) {
      logger.warn('Invalid swap rate detected', { 
        sellAsset: sellCode, 
        buyAsset: buyCode, 
        rate 
      });
      return null;
    }

    const rateObj = {
      sell_asset: sellCode,
      buy_asset: buyCode,
      rate: parseFloat(rate.toFixed(decimals)),
      decimals,
    };

    // Store in cache
    this.swapRateCache.set(cacheKey, { rate: rateObj, timestamp: Date.now() });
    swapRateCache.set(cacheKey, { rate: rateObj, timestamp: Date.now() });

    return rateObj;
  }

  /**
   * Get all supported asset pairs
   * @returns Array of all supported asset pairs
   */
  async getSupportedPairs(): Promise<AssetPair[]> {
    try {
      const assets = Object.keys(MOCK_SWAP_RATES);
      const pairs: AssetPair[] = [];

      for (const sellAsset of assets) {
        if (!MOCK_SWAP_RATES[sellAsset]) continue;
        
        for (const buyAsset of Object.keys(MOCK_SWAP_RATES[sellAsset])) {
          pairs.push({
            sell_asset: sellAsset,
            buy_asset: buyAsset,
          });
        }
      }

      return pairs;
    } catch (error) {
      logger.error('Error getting supported pairs', { 
        error: error instanceof Error ? error.message : 'unknown error' 
      });
      return [];
    }
  }

  /**
   * Update mock swap rate (for testing/admin purposes)
   * @param sellAsset Asset code to sell
   * @param buyAsset Asset code to buy
   * @param rate New swap rate
   */
  updateSwapRate(sellAsset: string, buyAsset: string, rate: number): void {
    const sellCode = sellAsset.toUpperCase();
    const buyCode = buyAsset.toUpperCase();

    if (!MOCK_SWAP_RATES[sellCode]) {
      MOCK_SWAP_RATES[sellCode] = {};
    }

    MOCK_SWAP_RATES[sellCode][buyCode] = rate;
    
    // Invalidate cache for this pair and its inverse
    const cacheKey = `${sellCode}/${buyCode}`;
    const inverseCacheKey = `${buyCode}/${sellCode}`;
    this.swapRateCache.delete(cacheKey);
    this.swapRateCache.delete(inverseCacheKey);
  }
}

// Export singleton instance
export const sep40Controller = new Sep40Controller();
