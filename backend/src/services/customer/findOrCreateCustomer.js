

import Customer from "../../models/Customer.js";

export const findOrCreateCustomer = async ({ name, phone, email }) => {
  if (!phone) throw new Error("Customer phone number is required.");

  const normalizedPhone = String(phone).trim();
  const normalizedName = String(name || "Guest").trim() || "Guest";
  const normalizedEmail = email ? String(email).trim().toLowerCase() : null;

  // Phone is the unique customer identifier in the current schema.
  // Do not require the customer's name to match during lookup; names can change independently.
  let customer = await Customer.findOne({ phone: normalizedPhone, isDeleted: false });

  if (customer) {
    customer.fullName = normalizedName;
    if (email !== undefined) customer.email = normalizedEmail;
    await customer.save();
    return customer;
  }

  return Customer.create({
    fullName: normalizedName,
    phone: normalizedPhone,
    email: normalizedEmail,
  });
};




// import Customer from "../../models/Customer.js";

// /*
// |--------------------------------------------------------------------------
// | Find Existing Customer
// | Create if Doesn't Exist
// |--------------------------------------------------------------------------
// */

// export const findOrCreateCustomer = async ({
//     name,
//     phone,
//     email 
// }) => {

//     try {

//         /*
//         |--------------------------------------------------------------------------
//         | Validation
//         |--------------------------------------------------------------------------
//         */

//         if (!phone) {
//             throw new Error("Customer phone number is required.");
//         }

//         /*
//         |--------------------------------------------------------------------------
//         | Find Existing Customer
//         |--------------------------------------------------------------------------
//         */

//         let customer = await Customer.findOne({
//             phone,
//             fullname:name,
//             isDeleted: false,
//         });

//         /*
//         |--------------------------------------------------------------------------
//         | Customer Exists
//         |--------------------------------------------------------------------------
//         */

//         if (customer) {

//             /*
//             Update latest information
//             */

//             if (name && customer.name !== name) {
//                 customer.name = name;
//             }

//             if (email && customer.email !== email) {
//                 customer.email = email;
//             }

//             await customer.save();

//             return customer;

//         }

//         /*
//         |--------------------------------------------------------------------------
//         | Create New Customer
//         |--------------------------------------------------------------------------
//         */

//         customer = await Customer.create({

//             fullName:name,

//             phone,

//             email,

//         });

//         return customer;

//     }

//     catch (error) {

//         console.error(
//             "Find/Create Customer Error:",
//             error
//         );

//         throw error;

//     }

// };