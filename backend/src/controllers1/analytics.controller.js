import {
    getAnalyticsOverview,
} from "../services/analytics/analytics.service.js";


/*
|--------------------------------------------------------------------------
| Analytics Controller
|--------------------------------------------------------------------------
*/


export const getAnalyticsOverviewController = async (
    req,
    res,
    next
) => {

    try {

        const {
            from,
            to,
        } = req.query || {};


        const analytics =
            await getAnalyticsOverview({
                from,
                to,
            });


        return res.status(200).json({

            success: true,

            data:
                analytics,

            message:
                "Analytics retrieved successfully.",
        });

    } catch (error) {

        console.error(
            "Analytics Controller Error:",
            error
        );

        return next(error);
    }
};