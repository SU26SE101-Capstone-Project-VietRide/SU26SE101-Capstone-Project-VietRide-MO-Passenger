export type PromoDiscount =
  | {
      type: 'fixed';
      amount: number;
    }
  | {
      type: 'percent';
      percent: number;
      maxAmount?: number;
    };

export interface PromoOffer {
  id: string;
  code: string;
  title: string;
  description: string;
  discountLabel: string;
  expiresAt: string;
  discount: PromoDiscount;
  minimumSpend?: number;
}

export const normalizePromoCode = (code: string): string => code.trim().toUpperCase();

export const findPromoByCode = (
  promos: PromoOffer[],
  code: string,
): PromoOffer | undefined => {
  const normalizedCode = normalizePromoCode(code);
  return promos.find((promo) => normalizePromoCode(promo.code) === normalizedCode);
};

export const calculatePromoDiscount = (
  promo: PromoOffer,
  subtotal: number,
): number => {
  if (subtotal <= 0) {
    return 0;
  }

  if (promo.discount.type === 'fixed') {
    return Math.min(promo.discount.amount, subtotal);
  }

  const percentDiscount = Math.floor((subtotal * promo.discount.percent) / 100);
  const cappedDiscount = promo.discount.maxAmount
    ? Math.min(percentDiscount, promo.discount.maxAmount)
    : percentDiscount;

  return Math.min(cappedDiscount, subtotal);
};

export const isPromoExpired = (
  promo: PromoOffer,
  now: Date = new Date(),
): boolean => {
  const expiresAt = new Date(promo.expiresAt);

  if (Number.isNaN(expiresAt.getTime())) {
    return false;
  }

  return expiresAt.getTime() < now.getTime();
};

export const formatCurrency = (amount: number): string => {
  return `₫${Math.max(amount, 0).toLocaleString('vi-VN')}`;
};

export const formatPromoExpiry = (expiresAt: string): string => {
  const date = new Date(expiresAt);

  if (Number.isNaN(date.getTime())) {
    return expiresAt;
  }

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
};
