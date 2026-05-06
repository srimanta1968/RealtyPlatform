export type Currency = 'INR' | 'USD' | 'AED' | 'EUR';

export interface Money {
  readonly amountMinor: number;
  readonly currency: Currency;
}

export const money = (amountMinor: number, currency: Currency = 'INR'): Money => ({
  amountMinor,
  currency,
});
