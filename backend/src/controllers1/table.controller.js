import * as tableService from "../services/table/table.service.js";

/*
|--------------------------------------------------------------------------
| Create Table
|--------------------------------------------------------------------------
*/

export const createTable = async (req, res, next) => {
  try {
    const table = await tableService.createTable(req.body);

    return res.status(201).json({
      success: true,
      message: "Table created successfully.",
      data: table,
    });
  } catch (error) {
    next(error);
  }
};

/*
|--------------------------------------------------------------------------
| Get All Tables
|--------------------------------------------------------------------------
*/

export const getTables = async (req, res, next) => {
  try {
    const tables = await tableService.getTables(req.query);

    return res.status(200).json({
      success: true,
      count: tables.length,
      data: tables,
    });
  } catch (error) {
    next(error);
  }
};

/*
|--------------------------------------------------------------------------
| Get Table By ID
|--------------------------------------------------------------------------
*/

export const getTableById = async (req, res, next) => {
  try {
    const table = await tableService.getTableById(req.params.id);

    return res.status(200).json({
      success: true,
      data: table,
    });
  } catch (error) {
    next(error);
  }
};

/*
|--------------------------------------------------------------------------
| Update Table
|--------------------------------------------------------------------------
*/

export const updateTable = async (req, res, next) => {
  try {
    const table = await tableService.updateTable(
      req.params.id,
      req.body
    );

    return res.status(200).json({
      success: true,
      message: "Table updated successfully.",
      data: table,
    });
  } catch (error) {
    next(error);
  }
};
// export const updateTable = async (
//   tableId,
//   updateData
// ) => {

//   const table = await Table.findOne({
//     _id: tableId,
//     isDeleted: false,
//   });

//   if (!table) {
//     throw new AppError(
//       "Table not found.",
//       404
//     );
//   }

//   const allowedFields = [
//     "tableName",
//     "capacity",
//     "location",
//     "floor",
//     "status",
//     "isActive",
//     "isMergeable",
//     "mergedWith",
//     "notes",
//   ];

//   allowedFields.forEach((field) => {
//     if (updateData[field] !== undefined) {
//       table[field] = updateData[field];
//     }
//   });

//   await table.save();

//   return table;
// };
/*
|--------------------------------------------------------------------------
| Delete Table
|--------------------------------------------------------------------------
*/

export const deleteTable = async (req, res, next) => {
  try {
    await tableService.deleteTable(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Table deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};

/*
|--------------------------------------------------------------------------
| Update Table Status
|--------------------------------------------------------------------------
*/

export const updateTableStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    const table = await tableService.updateTableStatus(
      req.params.id,
      status
    );

    return res.status(200).json({
      success: true,
      message: "Table status updated successfully.",
      data: table,
    });
  } catch (error) {
    next(error);
  }
};