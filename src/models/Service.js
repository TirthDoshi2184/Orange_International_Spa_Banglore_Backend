import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    name_kn: { type: String, default: "" },
    category: { type: String, required: true },
    description: { type: String },
    description_kn: { type: String, default: "" },
    benefits: [{ type: String }],
    benefits_kn: [{ type: String }],
    instructions: [{ type: String }],
    instructions_kn: [{ type: String }],
    images: [{ type: String }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("Service", serviceSchema);
