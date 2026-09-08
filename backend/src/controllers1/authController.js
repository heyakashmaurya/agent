import authService from "../services//auth/auth.service.js";

/*
|--------------------------------------------------------------------------
| Register
|--------------------------------------------------------------------------
*/

export const register = async (req, res, next) => {

    try {

        const result = await authService.register(req.body);

        return res.status(201).json({
            success: true,
            message: "Account created successfully.",
            data: result,
        });

    } catch (error) {

        next(error);

    }

};

/*
|--------------------------------------------------------------------------
| Login
|--------------------------------------------------------------------------
*/

export const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        const result = await authService.login(
            email,
            password
        );

        console.log("TOKEN FROM SERVICE:", result.token);

        return res.status(200).json({
            success: true,
            message: "Login successful",
            token: result.token,
            user: result.user,
        });

    } catch (error) {
        next(error);
    }
};

// export const login = async (req, res, next) => {

//     try {

//         const { email, password } = req.body;

//         const result = await authService.login(
//             email,
//             password
//         );

//         return res.status(200).json({
//             success: true,
//             message: "Login successful.",
//             data: result,
//         });

//     } catch (error) {

//         next(error);

//     }

// };

/*
|--------------------------------------------------------------------------
| Get Profile
|--------------------------------------------------------------------------
*/

export const getProfile = async (req, res, next) => {

    try {

        const user = await authService.getProfile(
            req.user.id
        );

        return res.status(200).json({
            success: true,
            data: user,
        });

    } catch (error) {

        next(error);

    }

};

/*
|--------------------------------------------------------------------------
| Update Profile
|--------------------------------------------------------------------------
*/

export const updateProfile = async (req, res, next) => {

    try {

        const user = await authService.updateProfile(
            req.user.id,
            req.body
        );

        return res.status(200).json({
            success: true,
            message: "Profile updated successfully.",
            data: user,
        });

    } catch (error) {

        next(error);

    }

};

/*
|--------------------------------------------------------------------------
| Change Password
|--------------------------------------------------------------------------
*/

export const changePassword = async (req, res, next) => {

    try {

        const {
            currentPassword,
            newPassword,
        } = req.body;

        await authService.changePassword(
            req.user.id,
            currentPassword,
            newPassword
        );

        return res.status(200).json({
            success: true,
            message: "Password changed successfully.",
        });

    } catch (error) {

        next(error);

    }

};