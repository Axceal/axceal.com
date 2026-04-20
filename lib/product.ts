export const AERO = {
  sku: "AERO_X1",
  name: "Aero x1",
  priceInPaise: 999_900,
  maxQtyPerOrder: 5,
  currency: "INR",
} as const;

export type Product = typeof AERO;
