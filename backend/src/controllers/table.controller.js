import * as tableService from "../services/table/table.service.js";
import {
  parseBoolean,
  parsePositiveInt,
  parseString,
  isObjectId,
  sendError,
  sendSuccess,
  logControllerError,
} from "./_controllerUtils.js";

const STATUSES = ["Available", "Reserved", "Occupied", "Maintenance"];
const LOCATIONS = ["Indoor", "Outdoor", "Window", "Private"];

export const createTable = async (req, res, next) => {
  try {
    const b = req.body || {};
    const tableNumber = parsePositiveInt(b.tableNumber, null, 9999);
    const capacity = parsePositiveInt(b.capacity, null, 50);
    const location = parseString(b.location ?? b.section, "Indoor");
    const floor = parsePositiveInt(b.floor, 1, 100);

    if (!tableNumber) return sendError(res, { status: 400, message: "Table number must be a positive integer." });
    if (!capacity) return sendError(res, { status: 400, message: "Capacity must be between 1 and 50." });
    if (!LOCATIONS.includes(location)) return sendError(res, { status: 400, message: "Invalid table location." });
    if (!floor) return sendError(res, { status: 400, message: "Floor must be a positive integer." });

    const table = await tableService.createTable({
      tableNumber,
      tableName: parseString(b.tableName),
      capacity,
      location,
      floor,
      status: parseString(b.status, "Available"),
      isActive: parseBoolean(b.isActive, true),
      isMergeable: parseBoolean(b.isMergeable, false),
      mergedWith: Array.isArray(b.mergedWith) ? b.mergedWith : [],
      notes: parseString(b.notes),
    });

    return sendSuccess(res, { status: 201, message: "Table created successfully.", data: table });
  } catch (error) {
    logControllerError("TABLE_CREATE", error, req);
    return next(error);
  }
};

export const getTables = async (req, res, next) => {
  try {
    const filters = {};
    if (req.query?.status) {
      const status = parseString(req.query.status);
      if (!STATUSES.includes(status)) return sendError(res, { status: 400, message: "Invalid table status." });
      filters.status = status;
    }
    if (req.query?.location) {
      const location = parseString(req.query.location);
      if (!LOCATIONS.includes(location)) return sendError(res, { status: 400, message: "Invalid table location." });
      filters.location = location;
    }
    if (req.query?.floor !== undefined) {
      const floor = parsePositiveInt(req.query.floor, null, 100);
      if (!floor) return sendError(res, { status: 400, message: "Invalid floor." });
      filters.floor = floor;
    }
    if (req.query?.capacity !== undefined) {
      const capacity = parsePositiveInt(req.query.capacity, null, 50);
      if (!capacity) return sendError(res, { status: 400, message: "Invalid minimum capacity." });
      filters.capacity = capacity;
    }
    if (req.query?.isActive !== undefined) filters.isActive = parseBoolean(req.query.isActive);

    const tables = await tableService.getTables(filters);
    return sendSuccess(res, {
      data: tables || [],
      meta: { total: Array.isArray(tables) ? tables.length : 0 },
      message: "Tables retrieved successfully.",
    });
  } catch (error) {
    logControllerError("TABLE_LIST", error, req);
    return next(error);
  }
};

export const getTableById = async (req, res, next) => {
  try {
    const id = parseString(req.params?.id);
    if (!isObjectId(id)) return sendError(res, { status: 400, message: "Invalid table ID." });
    const table = await tableService.getTableById(id);
    return sendSuccess(res, { data: table });
  } catch (error) {
    logControllerError("TABLE_GET", error, req);
    return next(error);
  }
};

export const updateTable = async (req, res, next) => {
  try {
    const id = parseString(req.params?.id);
    if (!isObjectId(id)) return sendError(res, { status: 400, message: "Invalid table ID." });

    const b = req.body || {};
    const payload = {};
    if (b.tableNumber !== undefined) {
      const tableNumber = parsePositiveInt(b.tableNumber, null, 9999);
      if (!tableNumber) return sendError(res, { status: 400, message: "Invalid table number." });
      payload.tableNumber = tableNumber;
    }
    if (b.tableName !== undefined) payload.tableName = parseString(b.tableName);
    if (b.capacity !== undefined) {
      const capacity = parsePositiveInt(b.capacity, null, 50);
      if (!capacity) return sendError(res, { status: 400, message: "Capacity must be between 1 and 50." });
      payload.capacity = capacity;
    }
    if (b.location !== undefined) {
      const location = parseString(b.location);
      if (!LOCATIONS.includes(location)) return sendError(res, { status: 400, message: "Invalid table location." });
      payload.location = location;
    }
    if (b.floor !== undefined) {
      const floor = parsePositiveInt(b.floor, null, 100);
      if (!floor) return sendError(res, { status: 400, message: "Invalid floor." });
      payload.floor = floor;
    }
    if (b.status !== undefined) {
      const status = parseString(b.status);
      if (!STATUSES.includes(status)) return sendError(res, { status: 400, message: "Invalid table status." });
      payload.status = status;
    }
    if (b.isActive !== undefined) payload.isActive = parseBoolean(b.isActive);
    if (b.isMergeable !== undefined) payload.isMergeable = parseBoolean(b.isMergeable);
    if (b.mergedWith !== undefined) {
      if (!Array.isArray(b.mergedWith) || b.mergedWith.some((value) => !isObjectId(value))) return sendError(res, { status: 400, message: "Invalid mergedWith table IDs." });
      payload.mergedWith = b.mergedWith;
    }
    if (b.notes !== undefined) payload.notes = parseString(b.notes);

    if (!Object.keys(payload).length) return sendError(res, { status: 400, message: "No valid table fields were supplied." });

    const table = await tableService.updateTable(id, payload);
    return sendSuccess(res, { data: table, message: "Table updated successfully." });
  } catch (error) {
    logControllerError("TABLE_UPDATE", error, req);
    return next(error);
  }
};

export const deleteTable = async (req, res, next) => {
  try {
    const id = parseString(req.params?.id);
    if (!isObjectId(id)) return sendError(res, { status: 400, message: "Invalid table ID." });
    await tableService.deleteTable(id);
    return sendSuccess(res, { message: "Table deleted successfully." });
  } catch (error) {
    logControllerError("TABLE_DELETE", error, req);
    return next(error);
  }
};

export const updateTableStatus = async (req, res, next) => {
  try {
    const id = parseString(req.params?.id);
    const status = parseString(req.body?.status);
    if (!isObjectId(id)) return sendError(res, { status: 400, message: "Invalid table ID." });
    if (!STATUSES.includes(status)) return sendError(res, { status: 400, message: "Invalid table status." });

    const table = await tableService.updateTableStatus(id, status);
    return sendSuccess(res, { data: table, message: "Table status updated successfully." });
  } catch (error) {
    logControllerError("TABLE_STATUS", error, req);
    return next(error);
  }
};

export default { createTable, getTables, getTableById, updateTable, deleteTable, updateTableStatus };
