import authService from "../services/auth/auth.service.js";
import {
  parseString,
  sendSuccess,
  sendError,
  toError,
  logControllerError,
  pick,
} from "./_controllerUtils.js";

const PASSWORD_MIN_LENGTH = 6;

export const register = async (req, res, next) => {
  try {
    const body = req.body || {};
    const fullName = parseString(body.fullName || body.name);
    const email = parseString(body.email).toLowerCase();
    const password = parseString(body.password);
    const phone = parseString(body.phone);

    if (!fullName) return sendError(res, { status: 400, message: "Full name is required." });
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) return sendError(res, { status: 400, message: "A valid email address is required." });
    if (password.length < PASSWORD_MIN_LENGTH) return sendError(res, { status: 400, message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters.` });

    const result = await authService.register({ fullName, email, password, phone });
    const user = result?.user?.toObject ? result.user.toObject() : result?.user;
    if (user?.password) delete user.password;

    return sendSuccess(res, {
      status: 201,
      message: "Account created successfully.",
      data: { user: user || null, token: result?.token || null },
    });
  } catch (error) {
    logControllerError("AUTH_REGISTER", error, req);
    return next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const email = parseString(req.body?.email).toLowerCase();
    const password = parseString(req.body?.password);
    if (!email || !password) return sendError(res, { status: 400, message: "Email and password are required." });

    const result = await authService.login(email, password);
    const user = result?.user?.toObject ? result.user.toObject() : result?.user;
    if (user?.password) delete user.password;

    return sendSuccess(res, {
      message: "Login successful.",
      data: { user: user || null, token: result?.token || null },
    });
  } catch (error) {
    logControllerError("AUTH_LOGIN", error, req);
    const normalized = toError(error, 401);
    return sendError(res, { status: normalized.status, message: normalized.message });
  }
};

export const getProfile = async (req, res, next) => {
  try {
    const user = await authService.getProfile(req.user.id);
    const data = user?.toObject ? user.toObject() : user;
    if (data?.password) delete data.password;
    return sendSuccess(res, { data });
  } catch (error) {
    logControllerError("AUTH_PROFILE", error, req);
    return next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const payload = pick(req.body || {}, ["fullName", "phone", "preferredLanguage", "profileImage"]);
    if (payload.fullName !== undefined && !parseString(payload.fullName)) {
      return sendError(res, { status: 400, message: "Full name cannot be empty." });
    }
    if (payload.preferredLanguage !== undefined && !["en", "hi"].includes(payload.preferredLanguage)) {
      return sendError(res, { status: 400, message: "Preferred language must be 'en' or 'hi'." });
    }

    const user = await authService.updateProfile(req.user.id, payload);
    const data = user?.toObject ? user.toObject() : user;
    if (data?.password) delete data.password;
    return sendSuccess(res, { message: "Profile updated successfully.", data });
  } catch (error) {
    logControllerError("AUTH_UPDATE_PROFILE", error, req);
    return next(error);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const currentPassword = parseString(req.body?.currentPassword);
    const newPassword = parseString(req.body?.newPassword);
    if (!currentPassword || !newPassword) return sendError(res, { status: 400, message: "Current password and new password are required." });
    if (newPassword.length < PASSWORD_MIN_LENGTH) return sendError(res, { status: 400, message: `New password must be at least ${PASSWORD_MIN_LENGTH} characters.` });
    if (currentPassword === newPassword) return sendError(res, { status: 400, message: "New password must be different from the current password." });

    await authService.changePassword(req.user.id, currentPassword, newPassword);
    return sendSuccess(res, { message: "Password changed successfully." });
  } catch (error) {
    logControllerError("AUTH_CHANGE_PASSWORD", error, req);
    const normalized = toError(error, 400);
    return sendError(res, { status: normalized.status, message: normalized.message });
  }
};

export default { register, login, getProfile, updateProfile, changePassword };
