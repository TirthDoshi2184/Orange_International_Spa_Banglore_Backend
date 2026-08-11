import Booking from "../models/Booking.js";
import { getTodayRange } from "../utils/generateIds.js";

export const runDayEndCleanup = async () => {
  const { start, end } = getTodayRange();

  const unresolvedBookings = await Booking.find({
    bookingDate: { $gte: start, $lte: end },
    bookingStatus: { $in: ["waiting", "in-service"] },
  });

  let completed = 0, cancelled = 0, stillUnpaid = 0;

  for (const booking of unresolvedBookings) {
    if (booking.bookingStatus === "waiting") {
  booking.bookingStatus = "cancelled";
  await booking.save();
  await AddonOrder.updateMany(
    { bookingId: booking._id, status: { $ne: "delivered" } },
    { status: "cancelled" }
  );
  cancelled++;
  continue;
}

    // in-service — only auto-complete if fully paid, same rule as manual completion
    const totalPaid = booking.paymentHistory.reduce((sum, p) => sum + p.amount, 0);
    const outstanding = booking.grandTotal - totalPaid;

    if (outstanding <= 0) {
      booking.bookingStatus = "completed";
      await booking.save();
      completed++;
    } else {
      stillUnpaid++; // left as-is — still in-service, room still occupied, needs manual attention
    }
  }

  return { completed, cancelled, stillUnpaid, totalChecked: unresolvedBookings.length };
};