import mongoose from "mongoose";

const addonOrderItemSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["service", "mocktail"], required: true },
    refId: { type: mongoose.Schema.Types.ObjectId, required: true },
    name: { type: String, required: true }, // snapshot at order time
    price: { type: Number, required: true },
    qty: { type: Number, default: 1 },
  },
  { _id: false }
);

const addonOrderSchema = new mongoose.Schema(
  {
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: "Room", default: null }, // null until room is assigned at check-in
    items: [addonOrderItemSchema],
    amount: { type: Number, required: true },
    status: { type: String, enum: ["pending", "preparing", "delivered"], default: "pending" },
     source: { type: String, enum: ["initial", "addon"], default: "addon" }, // "initial" = placed at booking time, "addon" = added during room service
  },
  { timestamps: true }
);

export default mongoose.model("AddonOrder", addonOrderSchema);