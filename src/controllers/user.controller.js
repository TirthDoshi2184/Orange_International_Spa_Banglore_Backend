import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import User from "../models/User.js";

const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });

// POST /api/auth/admin/login
export const loginAdmin = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) throw { statusCode: 401, message: "Invalid credentials" };

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) throw { statusCode: 401, message: "Invalid credentials" };

    const token = signToken(user);
    res.json({ success: true, data: { token, name: user.name, email: user.email, role: user.role } });
  } catch (err) { next(err); }
};

// POST /api/admin/users  (protected — only an existing admin can create another)
export const createAdmin = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) throw { statusCode: 400, message: "Name, email, password required" };

    const existing = await User.findOne({ email });
    if (existing) throw { statusCode: 400, message: "User already exists" };

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, passwordHash });

    res.status(201).json({ success: true, data: { id: user._id, name: user.name, email: user.email } });
  } catch (err) { next(err); }
};

// GET /api/admin/users/me  (protected — confirm token identity, get logged-in admin's own info)
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.admin.id).select("-passwordHash");
    if (!user) throw { statusCode: 404, message: "User not found" };
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
};

// GET /api/admin/users  (protected — list all admins)
export const getAllAdmins = async (req, res, next) => {
  try {
    const users = await User.find().select("-passwordHash");
    res.json({ success: true, data: users });
  } catch (err) { next(err); }
};