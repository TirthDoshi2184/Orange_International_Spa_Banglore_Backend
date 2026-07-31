import mongoose from "mongoose";

const customerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    mobileNumber: { type: String, required: true, unique: true, index: true },
    email: { type: String },
    gender: { type: String, enum: ["male", "female", "other"] },
    visitHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: "Booking" }],
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.model("Customer", customerSchema);
