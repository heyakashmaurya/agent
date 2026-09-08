import mongoose from "mongoose";

export const parseString = (value, fallback = "") => {
  if (value === undefined || value === null) return fallback;
  return String(value).trim();
};

export const parseBoolean = (value, fallback = undefined) => {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  const normalized = String(value).trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(normalized)) return true;
  if (["false", "0", "no", "off"].includes(normalized)) return false;
  return fallback;
};

export const parsePositiveInt = (value, fallback = null, max = Number.MAX_SAFE_INTEGER) => {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > max) return null;
  return parsed;
};

export const parseNonNegativeInt = (value, fallback = null, max = Number.MAX_SAFE_INTEGER) => {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > max) return null;
  return parsed;
};

export const isObjectId = (value) => mongoose.Types.ObjectId.isValid(String(value || ""));

export const isValidDateString = (value) => {
  const date = new Date(value);
  return Boolean(value) && !Number.isNaN(date.getTime());
};

export const isValidTime = (value) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value || ""));

export const pick = (source, fields) => {
  const result = {};
  for (const field of fields) {
    if (source?.[field] !== undefined) result[field] = source[field];
  }
  return result;
};

export const omit = (source, fields) => {
  const blocked = new Set(fields);
  return Object.fromEntries(Object.entries(source || {}).filter(([key]) => !blocked.has(key)));
};

export const sendSuccess = (res, { status = 200, message = "Request successful.", data, meta } = {}) => {
  const body = { success: true, message };
  if (data !== undefined) body.data = data;
  if (meta !== undefined) body.meta = meta;
  return res.status(status).json(body);
};

export const sendError = (res, { status = 400, message = "Request failed.", details, code } = {}) => {
  const body = { success: false, message };
  if (code) body.code = code;
  if (details !== undefined) body.details = details;
  return res.status(status).json(body);
};

export const toError = (error, fallbackStatus = 500) => {
  const status = error?.statusCode || error?.status || fallbackStatus;
  return { status, message: error?.message || "Internal server error." };
};

export const logControllerError = (scope, error, req) => {
  console.error(`[${scope}]`, {
    method: req?.method,
    path: req?.originalUrl,
    message: error?.message,
    name: error?.name,
    stack: process.env.NODE_ENV === "production" ? undefined : error?.stack,
  });
};

export const asyncController = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
