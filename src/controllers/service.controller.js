import Service from "../models/Service.js";
import ServiceDuration from "../models/ServiceDuration.js";

export const getServices = async (req, res) => {
  const services = await Service.aggregate([
    { $match: { isActive: true } },
    { $lookup: { from: "servicedurations", localField: "_id", foreignField: "serviceId", as: "durations" } },
  ]);
  res.json({ success: true, data: services });
};

export const getServiceById = async (req, res) => {
  const service = await Service.findById(req.params.id);
  if (!service) return res.status(404).json({ success: false, message: "Service not found" });
  const durations = await ServiceDuration.find({ serviceId: service._id, isActive: true });
  res.json({ success: true, data: { ...service.toObject(), durations } });
};

export const createService = async (req, res) => {
  const {
    name, name_kn, category, description, description_kn,
    benefits, benefits_kn, instructions, instructions_kn, images, durations,
  } = req.body;

  const service = await Service.create({
    name, name_kn, category, description, description_kn,
    benefits, benefits_kn, instructions, instructions_kn, images,
  });

  if (Array.isArray(durations) && durations.length) {
    const docs = durations.map((d) => ({ ...d, serviceId: service._id }));
    await ServiceDuration.insertMany(docs);
  }
  res.status(201).json({ success: true, data: service });
};

export const updateService = async (req, res) => {
  const service = await Service.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!service) return res.status(404).json({ success: false, message: "Service not found" });
  res.json({ success: true, data: service });
};

export const deleteService = async (req, res) => {
  await ServiceDuration.deleteMany({ serviceId: req.params.id });
  await Service.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: "Service deleted" });
};

// Duration sub-resource
export const addDuration = async (req, res) => {
  const duration = await ServiceDuration.create({ ...req.body, serviceId: req.params.serviceId });
  res.status(201).json({ success: true, data: duration });
};

export const updateDuration = async (req, res) => {
  const duration = await ServiceDuration.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!duration) return res.status(404).json({ success: false, message: "Duration not found" });
  res.json({ success: true, data: duration });
};

export const deleteDuration = async (req, res) => {
  await ServiceDuration.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: "Duration deleted" });
};

export const getAllServicesAdmin = async (req, res, next) => {
  try {
    const services = await Service.aggregate([
      { $lookup: { from: "servicedurations", localField: "_id", foreignField: "serviceId", as: "durations" } },
    ]); // no isActive filter — admin needs everything
    res.json({ success: true, data: services });
  } catch (err) { next(err); }
};

// service.controller.js — add this export

export const bulkCreateServices = async (req, res, next) => {
  try {
    const { services } = req.body;
    if (!Array.isArray(services) || !services.length) {
      return res.status(400).json({ success: false, message: "services array is required" });
    }

    const created = [];
    for (const item of services) {
      const { durations, ...serviceFields } = item;
      const service = await Service.create(serviceFields);

      if (Array.isArray(durations) && durations.length) {
        const docs = durations.map((d) => ({ ...d, serviceId: service._id }));
        await ServiceDuration.insertMany(docs);
      }
      created.push(service);
    }

    res.status(201).json({ success: true, count: created.length, data: created });
  } catch (err) {
    next(err);
  }
};