import jwt from "jsonwebtoken";

export const protectAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Not authorized" });
  }
  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};

// Non-blocking version of protectAdmin — used on routes that are shared between
// public customer flows and admin/reception flows (e.g. /bookings, /bookings/calculate).
// If a valid admin token is present, req.admin is set; otherwise the request
// proceeds as a normal (non-admin) request instead of being rejected.
export const attachAdminIfPresent = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return next();
  try {
    const token = authHeader.split(" ")[1];
    req.admin = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    // invalid/expired token on a public route — ignore, just treat as non-admin
  }
  next();
};