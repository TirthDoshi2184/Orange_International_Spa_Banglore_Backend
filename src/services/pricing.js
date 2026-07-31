export const calculateTotals = ({ servicesTotal, mocktailsTotal, discountPercent = 0, gstRate = 5 }) => {
  const subtotal = servicesTotal + mocktailsTotal;
  const discount = Math.round((subtotal * discountPercent) / 100);
  const afterDiscount = subtotal - discount;
  const gst = Math.round((afterDiscount * gstRate) / 100);
  const grandTotal = afterDiscount + gst;
  return { subtotal, discount, gst, grandTotal };
};