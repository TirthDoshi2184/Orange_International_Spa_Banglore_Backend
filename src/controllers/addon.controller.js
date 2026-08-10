import AddonOrder from "../models/AddOnOrder.js";

export const getAddonOrders = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const orders = await AddonOrder.find(filter)
      .populate("roomId", "name type")
      .populate({
        path: "bookingId",
        select: "bookingNumber customerId",
        populate: { path: "customerId", select: "name mobileNumber" },
      })
      .sort({ createdAt: -1 });
    res.json({ success: true, data: orders });
  } catch (err) { next(err); }
};

export const updateAddonOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const order = await AddonOrder.findByIdAndUpdate(req.params.id, { status }, { new: true })
      .populate("roomId", "name type")
      .populate({
        path: "bookingId",
        select: "bookingNumber customerId",
        populate: { path: "customerId", select: "name mobileNumber" },
      });
    if (!order) throw { statusCode: 404, message: "Order not found" };
    res.json({ success: true, data: order });
  } catch (err) { next(err); }
};