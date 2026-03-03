export interface Trade {
  id?: number;
  date: string;
  asset: string;
  type: 'Stock' | 'ETF' | 'Mutual Fund' | 'Call Option' | 'Put Option';
  purchase_price: number;
  selling_price: number;
  purchase_qty: number;
  sold_qty: number;
  balance_qty: number;
  entry_reason: string;
  exit_reason: string;
  emotion: string;
  discipline_score: number;
  p_l: number;
  notes: string;
}

export const ASSET_TYPES = ['Stock', 'ETF', 'Mutual Fund', 'Call Option', 'Put Option'] as const;

export const EMOTIONS = [
  'Calm',
  'Confident',
  'Anxious (FOMO)',
  'Fearful',
  'Greedy',
  'Revengeful',
  'Bored',
  'Hesitant'
] as const;

export const ENTRY_REASONS = [
  'Trend Following',
  'Support/Resistance',
  'Earnings Play',
  'News-Based',
  'Algorithm Signal',
  'DCA (Dollar Cost Averaging)',
  'Value Play'
] as const;
