import Customer from "../../models/Customer.js";

/*
|--------------------------------------------------------------------------
| Find Existing Customer
| Create if Doesn't Exist
|--------------------------------------------------------------------------
*/

export const findOrCreateCustomer = async ({
    name,
    phone,
    email 
}) => {

    try {

        /*
        |--------------------------------------------------------------------------
        | Validation
        |--------------------------------------------------------------------------
        */

        if (!phone) {
            throw new Error("Customer phone number is required.");
        }

        /*
        |--------------------------------------------------------------------------
        | Find Existing Customer
        |--------------------------------------------------------------------------
        */

        let customer = await Customer.findOne({
            phone,
            fullname:name,
            isDeleted: false,
        });

        /*
        |--------------------------------------------------------------------------
        | Customer Exists
        |--------------------------------------------------------------------------
        */

        if (customer) {

            /*
            Update latest information
            */

            if (name && customer.name !== name) {
                customer.name = name;
            }

            if (email && customer.email !== email) {
                customer.email = email;
            }

            await customer.save();

            return customer;

        }

        /*
        |--------------------------------------------------------------------------
        | Create New Customer
        |--------------------------------------------------------------------------
        */

        customer = await Customer.create({

            fullName:name,

            phone,

            email,

        });

        return customer;

    }

    catch (error) {

        console.error(
            "Find/Create Customer Error:",
            error
        );

        throw error;

    }

};