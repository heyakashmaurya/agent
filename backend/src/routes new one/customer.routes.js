import express from "express";
import auth from "../middleware/auth.js";
import authorize from "../middleware/authorize.js";
import {
  listCustomers,
  getCustomerById,
  findCustomer,
  updateCustomer,
} from "../controllers/customer.controller.js";

const router = express.Router();
router.use(auth);

router.get("/", authorize("Owner", "Manager", "Staff"), listCustomers);
router.get("/find", authorize("Owner", "Manager", "Staff"), findCustomer);
router.get("/:id", authorize("Owner", "Manager", "Staff"), getCustomerById);
router.patch("/:id", authorize("Owner", "Manager"), updateCustomer);

export default router;
