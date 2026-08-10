import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { connectDB } from "./src/config/db.js";
import { errorHandler } from "./src/middlewares/errorHandler.js";

import authRoutes from "./src/routes/auth.routes.js";
import serviceRoutes from "./src/routes/service.routes.js";
import mocktailRoutes from "./src/routes/mocktail.routes.js";
import timeslotRoutes from "./src/routes/timeslot.routes.js";
import bookingRoutes from "./src/routes/booking.routes.js";
import couponRoutes from "./src/routes/coupon.routes.js";
import reviewRoutes from "./src/routes/review.routes.js";
import reportRoutes from "./src/routes/report.routes.js";
import userRoutes from "./src/routes/user.routes.js";
import roomRoutes from "./src/routes/room.routes.js";
import adminRoutes from "./src/routes/admin.routes.js";
import customerRoutes from "./src/routes/customer.routes.js";
import addonRoutes from "./src/routes/addon.routes.js";
const app = express();

app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(helmet());
app.use(express.json());

app.use("/api", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api", serviceRoutes);
app.use("/api", mocktailRoutes);
app.use("/api", timeslotRoutes);
app.use("/api", roomRoutes);
app.use("/api", addonRoutes);

app.use("/api", bookingRoutes);
app.use("/api", couponRoutes);
app.use("/api", reviewRoutes);

app.use("/api", adminRoutes);
app.use("/api", customerRoutes);


app.use("/api", reportRoutes);


app.use(errorHandler);

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});
