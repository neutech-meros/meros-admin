import { productPlan } from '../user-details';

describe('productPlan', () => {
  it.each([
    ['com.meros.premium.monthly', 'premium'],
    ['com.meros.PREMIUM.annual', 'premium'],
    ['com.meros.freemium', 'freemium'],
    ['com.meros.premium.trial', 'freeTrial'],
    ['Meros_Trial_7d', 'freeTrial'],
  ])('maps %s to %s', (sku, plan) => {
    expect(productPlan(sku)).toBe(plan);
  });

  it('returns null for a SKU it cannot recognise', () => {
    expect(productPlan('com.meros.pro.legacy')).toBeNull();
  });
});
