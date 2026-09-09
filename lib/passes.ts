// One source of truth for pass pricing. The pricing page renders from this and
// /api/pass-checkout charges from it, so a price can never be advertised at one
// number and charged at another.

export const PASS_SIZES = [4, 6, 10] as const;
export type PassSize = (typeof PASS_SIZES)[number];

// Amounts in the smallest currency unit, matching clubs.price_amount.
export const SINGLE_SESSION_AMOUNT = 2000;

export const PASS_CATALOG: Record<PassSize, { sessions: PassSize; priceAmount: number; currency: string }> = {
  4: { sessions: 4, priceAmount: 7200, currency: "usd" },
  6: { sessions: 6, priceAmount: 10200, currency: "usd" },
  10: { sessions: 10, priceAmount: 16000, currency: "usd" },
};

export function isPassSize(value: unknown): value is PassSize {
  return typeof value === "number" && (PASS_SIZES as readonly number[]).includes(value);
}

export function dollars(amount: number) {
  return amount / 100;
}
