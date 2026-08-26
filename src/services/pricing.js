export const calculateTotals = ({
  servicesTotal,
  mocktailsTotal,
  discountPercent = 0,       // coupon discount — applied pre-GST (unchanged behavior)
  gstRate = 5,
  manualDiscountPercent = 0, // reception-entered discount — applied post-GST (see below)
}) => {
  const subtotal = servicesTotal + mocktailsTotal;

  const couponDiscount = Math.round((subtotal * discountPercent) / 100);
  const afterCouponDiscount = subtotal - couponDiscount;
  const gst = Math.round((afterCouponDiscount * gstRate) / 100);
  const totalBeforeManualDiscount = afterCouponDiscount + gst;

  // Receptionist's manual discount — applied on the FINAL payable amount (post-GST).
  // e.g. total payable 24000, 10% discount -> 21600.
  const manualDiscountAmount = Math.round((totalBeforeManualDiscount * manualDiscountPercent) / 100);
  const grandTotal = totalBeforeManualDiscount - manualDiscountAmount;

  /* ---- ALTERNATE: apply manual discount BEFORE GST (on subtotal), like the coupon ----
     To switch to this behavior later, comment out the block above from
     "const couponDiscount" down to "const grandTotal", and uncomment this instead:

  const combinedDiscountPercent = discountPercent + manualDiscountPercent;
  const couponDiscount = Math.round((subtotal * discountPercent) / 100);
  const manualDiscountAmount = Math.round((subtotal * manualDiscountPercent) / 100);
  const totalDiscount = Math.round((subtotal * combinedDiscountPercent) / 100);
  const afterCouponDiscount = subtotal - totalDiscount;
  const gst = Math.round((afterCouponDiscount * gstRate) / 100);
  const grandTotal = afterCouponDiscount + gst;
  */

  return {
    subtotal,
    discount: couponDiscount + manualDiscountAmount, // total ₹ off, shown as one "Discount" line everywhere
    gst,
    grandTotal,
    manualDiscountPercent,
    manualDiscountAmount,
  };
};