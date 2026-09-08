

import twilio from "twilio";

import {
    processConversation,
} from "../services/voice/deepseekService.js";

import {
    listCallLogs,
    getCallById,
    getCallBySid,
    createCallLog,
    updateCallLog,
    completeCall,
} from "../services/call/call.service.js";

import mongoose from "mongoose";


const VoiceResponse =
    twilio.twiml.VoiceResponse;


/*
|--------------------------------------------------------------------------
| In-memory voice sessions
|--------------------------------------------------------------------------
|
| This is kept for your current Twilio conversation flow.
|
| IMPORTANT:
| For multi-instance production deployment, move this state to Redis.
|
|--------------------------------------------------------------------------
*/

const sessions =
    new Map();


/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

const stringValue = (
    value,
    defaultValue = ""
) => {

    if (
        value === undefined ||
        value === null
    ) {
        return defaultValue;
    }

    return String(
        value
    ).trim();
};


const positiveInteger = (
    value,
    defaultValue = null
) => {

    const parsed =
        Number(value);

    if (
        !Number.isInteger(parsed) ||
        parsed < 1
    ) {
        return defaultValue;
    }

    return parsed;
};


const isValidObjectId = (
    value
) => {

    return mongoose.Types.ObjectId.isValid(
        value
    );
};


const getSession = (
    caller
) => {

    if (
        !sessions.has(
            caller
        )
    ) {

        sessions.set(
            caller,
            {
                intent: null,

                guests: null,

                date: null,

                time: null,

                name: null,

                phone: caller,

                confirmed: false,

                awaitingConfirmation: false,

                callLogId: null,
            }
        );
    }

    return sessions.get(
        caller
    );
};


const updateSession = (
    session,
    data
) => {

    for (
        const key in data
    ) {

        if (
            data[key] !== null &&
            data[key] !== undefined
        ) {

            session[key] =
                data[key];
        }
    }
};


const clearSession = (
    caller
) => {

    sessions.delete(
        caller
    );
};


/*
|--------------------------------------------------------------------------
| Create Initial Call Log
|--------------------------------------------------------------------------
|
| Creates a CallLog when a Twilio call enters the application.
|
|--------------------------------------------------------------------------
*/

const ensureCallLog = async ({
    callSid,
    phoneNumber,
    direction = "Incoming",
    callStatus = "Ringing",
    roomName = "",
}) => {

    if (
        !phoneNumber
    ) {
        return null;
    }


    /*
    |--------------------------------------------------------------------------
    | Existing Call
    |--------------------------------------------------------------------------
    */

    if (
        callSid
    ) {

        const existing =
            await getCallBySid(
                callSid
            );

        if (
            existing
        ) {
            return existing;
        }
    }


    /*
    |--------------------------------------------------------------------------
    | Create New Call Log
    |--------------------------------------------------------------------------
    */

    return await createCallLog({
        callSid:
            stringValue(
                callSid
            ),

        phoneNumber:
            stringValue(
                phoneNumber
            ),

        direction,

        callStatus,

        roomName:
            stringValue(
                roomName
            ),

        aiHandled:
            true,
    });
};


/*
|--------------------------------------------------------------------------
| Twilio Incoming Call
|--------------------------------------------------------------------------
*/

export const incomingCall = async (
    req,
    res,
    next
) => {

    const twiml =
        new VoiceResponse();


    try {

        const callSid =
            stringValue(
                req.body?.CallSid ||
                req.query?.CallSid
            );


        const caller =
            stringValue(
                req.body?.From ||
                req.query?.From
            );


        /*
        |--------------------------------------------------------------------------
        | Create Call Log
        |--------------------------------------------------------------------------
        */

        const callLog =
            await ensureCallLog({
                callSid,

                phoneNumber:
                    caller,

                direction:
                    "Incoming",

                callStatus:
                    "Ringing",
            });


        /*
        |--------------------------------------------------------------------------
        | Initialize Session
        |--------------------------------------------------------------------------
        */

        const session =
            getSession(
                caller
            );


        if (
            callLog
        ) {

            session.callLogId =
                callLog._id.toString();
        }


        /*
        |--------------------------------------------------------------------------
        | Greeting
        |--------------------------------------------------------------------------
        */

        twiml.say(
            {
                voice:
                    "Polly.Joanna",

                language:
                    "en-US",
            },

            "Hello, thanks for calling. How can I help you today?"
        );


        /*
        |--------------------------------------------------------------------------
        | Gather Speech
        |--------------------------------------------------------------------------
        */

        twiml.gather({

            input: [
                "speech",
            ],

            action:
                "https://duvet-twirl-expansive.ngrok-free.dev/api/call/process",

            method:
                "POST",

            speechTimeout:
                "auto",
        });


        return res
            .type("text/xml")
            .send(
                twiml.toString()
            );

    } catch (error) {

        console.error(
            "Incoming Call Error:",
            error
        );

        return next(
            error
        );
    }
};


/*
|--------------------------------------------------------------------------
| Process Call
|--------------------------------------------------------------------------
*/

export const processCall = async (
    req,
    res,
    next
) => {

    const twiml =
        new VoiceResponse();


    try {

        const speechText =
            stringValue(
                req.body?.SpeechResult
            );


        const caller =
            stringValue(
                req.body?.From ||
                "unknown"
            );


        const callSid =
            stringValue(
                req.body?.CallSid
            );


        const session =
            getSession(
                caller
            );


        /*
        |--------------------------------------------------------------------------
        | Ensure CallLog Exists
        |--------------------------------------------------------------------------
        */

        let callLog =
            null;


        if (
            session.callLogId &&
            isValidObjectId(
                session.callLogId
            )
        ) {

            try {

                callLog =
                    await getCallById(
                        session.callLogId
                    );

            } catch {
                callLog =
                    null;
            }
        }


        if (
            !callLog
        ) {

            callLog =
                await ensureCallLog({
                    callSid,

                    phoneNumber:
                        caller,

                    direction:
                        "Incoming",

                    callStatus:
                        "Answered",
                });


            if (
                callLog
            ) {

                session.callLogId =
                    callLog._id.toString();
            }
        }


        /*
        |--------------------------------------------------------------------------
        | Mark Answered
        |--------------------------------------------------------------------------
        */

        if (
            callLog &&
            callLog.callStatus ===
                "Ringing"
        ) {

            callLog =
                await updateCallLog(
                    callLog._id,
                    {
                        callStatus:
                            "Answered",
                    }
                );
        }


        console.log(
            "User:",
            speechText
        );


        /*
        |--------------------------------------------------------------------------
        | Empty Speech
        |--------------------------------------------------------------------------
        */

        if (
            !speechText
        ) {

            twiml.say(
                {
                    voice:
                        "Polly.Joanna",

                    language:
                        "en-US",
                },

                "Sorry, I didn't hear that. Please tell me how I can help."
            );


            twiml.gather({

                input: [
                    "speech",
                ],

                action:
                    "https://duvet-twirl-expansive.ngrok-free.dev/api/call/process",

                method:
                    "POST",

                speechTimeout:
                    "auto",
            });


            return res
                .type("text/xml")
                .send(
                    twiml.toString()
                );
        }


        /*
        |--------------------------------------------------------------------------
        | Store Transcript
        |--------------------------------------------------------------------------
        */

        if (
            callLog
        ) {

            const existingTranscript =
                callLog.transcript ||
                "";


            const newTranscript =
                existingTranscript
                    ? `${existingTranscript}\nUser: ${speechText}`
                    : `User: ${speechText}`;


            callLog =
                await updateCallLog(
                    callLog._id,
                    {
                        transcript:
                            newTranscript,
                    }
                );
        }


        /*
        |--------------------------------------------------------------------------
        | Confirmation Step
        |--------------------------------------------------------------------------
        */

        if (
            session.awaitingConfirmation
        ) {

            const reply =
                speechText
                    .toLowerCase()
                    .trim();


            if (
                reply.includes(
                    "yes"
                ) ||
                reply.includes(
                    "correct"
                )
            ) {

                session.confirmed =
                    true;

                session.awaitingConfirmation =
                    false;

            } else if (
                reply.includes(
                    "no"
                )
            ) {

                session.awaitingConfirmation =
                    false;


                twiml.say(
                    "No problem. What would you like to change?"
                );


                twiml.gather({

                    input: [
                        "speech",
                    ],

                    action:
                        "https://duvet-twirl-expansive.ngrok-free.dev/api/call/process",

                    method:
                        "POST",

                    speechTimeout:
                        "auto",
                });


                return res
                    .type("text/xml")
                    .send(
                        twiml.toString()
                    );

            } else {

                twiml.say(
                    "Please say yes or no."
                );


                twiml.gather({

                    input: [
                        "speech",
                    ],

                    action:
                        "https://duvet-twirl-expansive.ngrok-free.dev/api/call/process",

                    method:
                        "POST",

                    speechTimeout:
                        "auto",
                });


                return res
                    .type("text/xml")
                    .send(
                        twiml.toString()
                    );
            }
        }


        /*
        |--------------------------------------------------------------------------
        | AI Processing
        |--------------------------------------------------------------------------
        */

        const result =
            await processConversation(
                speechText,
                session
            );


        updateSession(
            session,
            result
        );


        let message =
            result?.reply ||
            "How can I help you with your reservation?";


        /*
        |--------------------------------------------------------------------------
        | Ask Confirmation
        |--------------------------------------------------------------------------
        */

        const bookingReady =
            [
                "booking",
                "booking_ready",
                "inquiry",
                "cancel",
            ].includes(
                session.intent
            );


        if (
            bookingReady &&
            session.guests &&
            session.date &&
            session.time &&
            session.name &&
            !session.confirmed
        ) {

            session.awaitingConfirmation =
                true;


            message =
                `Just to confirm, a table for ${session.guests} people on ${session.date} at ${session.time}. Does that sound right?`;
        }


        /*
        |--------------------------------------------------------------------------
        | Final Booking
        |--------------------------------------------------------------------------
        |
        | IMPORTANT:
        | Your current Reservation.create() flow has been removed.
        |
        | The booking should now be created by your existing
        | booking service/tool and then linked to CallLog.
        |
        |--------------------------------------------------------------------------
        */

        if (
            bookingReady &&
            session.guests &&
            session.date &&
            session.time &&
            session.confirmed
        ) {

            /*
            |----------------------------------------------------------------------
            | Do NOT create a legacy Reservation here.
            |----------------------------------------------------------------------
            |
            | The next integration step should call your existing:
            |
            | services/booking/createBooking.js
            |
            | and pass:
            |
            | name
            | phone
            | bookingDate
            | startTime
            | guestCount
            |
            | Then attach the returned booking ID to CallLog.
            |
            |----------------------------------------------------------------------
            */

            if (
                callLog
            ) {

                callLog =
                    await updateCallLog(
                        callLog._id,
                        {
                            aiOutcome:
                                "Booking Created",

                            notes:
                                "Booking details collected and confirmed by caller.",
                        }
                    );
            }


            message =
                `Perfect! Your table for ${session.guests} people on ${session.date} at ${session.time} is confirmed. We look forward to serving you. Goodbye!`;


            /*
            |--------------------------------------------------------------------------
            | Complete Call
            |--------------------------------------------------------------------------
            */

            if (
                callLog
            ) {

                await completeCall(
                    callLog._id,
                    {
                        aiOutcome:
                            "Booking Created",

                        endedAt:
                            new Date(),
                    }
                );
            }


            twiml.say(
                {
                    voice:
                        "Polly.Joanna",

                    language:
                        "en-US",
                },

                message
            );


            twiml.hangup();


            clearSession(
                caller
            );


            return res
                .type("text/xml")
                .send(
                    twiml.toString()
                );
        }


        /*
        |--------------------------------------------------------------------------
        | Store AI Response
        |--------------------------------------------------------------------------
        */

        if (
            callLog
        ) {

            const existingTranscript =
                callLog.transcript ||
                "";


            const newTranscript =
                `${existingTranscript}\nAI: ${message}`;


            await updateCallLog(
                callLog._id,
                {
                    transcript:
                        newTranscript,

                    aiOutcome:
                        getAiOutcome(
                            session.intent
                        ),
                }
            );
        }


        /*
        |--------------------------------------------------------------------------
        | Respond
        |--------------------------------------------------------------------------
        */

        twiml.say(
            {
                voice:
                    "Polly.Joanna",

                language:
                    "en-US",
            },

            message
        );


        twiml.gather({

            input: [
                "speech",
            ],

            action:
                "https://duvet-twirl-expansive.ngrok-free.dev/api/call/process",

            method:
                "POST",

            speechTimeout:
                "auto",
        });


        return res
            .type("text/xml")
            .send(
                twiml.toString()
            );

    } catch (error) {

        console.error(
            "Process Call Error:",
            error
        );


        /*
        |--------------------------------------------------------------------------
        | Try to mark call failed
        |--------------------------------------------------------------------------
        */

        try {

            const callSid =
                stringValue(
                    req.body?.CallSid
                );


            if (
                callSid
            ) {

                const callLog =
                    await getCallBySid(
                        callSid
                    );


                if (
                    callLog
                ) {

                    await updateCallLog(
                        callLog._id,
                        {
                            callStatus:
                                "Failed",

                            notes:
                                error.message ||
                                "Call processing failed.",
                        }
                    );
                }
            }

        } catch (
            lifecycleError
        ) {

            console.error(
                "Call failure logging error:",
                lifecycleError
            );
        }


        twiml.say(
            {
                voice:
                    "Polly.Joanna",

                language:
                    "en-US",
            },

            "Sorry, something went wrong. Please try again later."
        );


        twiml.hangup();


        return res
            .type("text/xml")
            .send(
                twiml.toString()
            );
    }
};


/*
|--------------------------------------------------------------------------
| List Call Logs
|--------------------------------------------------------------------------
|
| GET /api/call/logs
|
|--------------------------------------------------------------------------
*/

export const listCallLogsController = async (
    req,
    res,
    next
) => {

    try {

        const {

            callStatus,

            direction,

            phoneNumber,

            customer,

            booking,

            aiOutcome,

            sentiment,

            aiHandled,

            transferredToHuman,

            from,

            to,

            page,

            limit,

        } = req.query || {};


        const result =
            await listCallLogs({

                callStatus:
                    stringValue(
                        callStatus
                    ) || undefined,

                direction:
                    stringValue(
                        direction
                    ) || undefined,

                phoneNumber:
                    stringValue(
                        phoneNumber
                    ) || undefined,

                customer:
                    stringValue(
                        customer
                    ) || undefined,

                booking:
                    stringValue(
                        booking
                    ) || undefined,

                aiOutcome:
                    stringValue(
                        aiOutcome
                    ) || undefined,

                sentiment:
                    stringValue(
                        sentiment
                    ) || undefined,

                aiHandled:
                    aiHandled !== undefined
                        ? stringValue(
                            aiHandled
                        )
                        : undefined,

                transferredToHuman:
                    transferredToHuman !==
                    undefined
                        ? stringValue(
                            transferredToHuman
                        )
                        : undefined,

                from:
                    stringValue(
                        from
                    ) || undefined,

                to:
                    stringValue(
                        to
                    ) || undefined,

                page:
                    page !== undefined
                        ? Number(page)
                        : 1,

                limit:
                    limit !== undefined
                        ? Number(limit)
                        : 20,
            });


        return res.status(
            200
        ).json({

            success:
                true,

            data: {
                calls:
                    result.calls,

                pagination: {
                    total:
                        result.total,

                    page:
                        result.page,

                    limit:
                        result.limit,

                    totalPages:
                        result.totalPages,
                },
            },

            message:
                "Call logs retrieved successfully.",
        });

    } catch (error) {

        console.error(
            "List Call Logs Controller Error:",
            error
        );

        return next(
            error
        );
    }
};


/*
|--------------------------------------------------------------------------
| Get Single Call Log
|--------------------------------------------------------------------------
|
| GET /api/call/logs/:id
|
|--------------------------------------------------------------------------
*/

export const getCallLogController = async (
    req,
    res,
    next
) => {

    try {

        const callId =
            stringValue(
                req.params?.id
            );


        if (
            !callId
        ) {

            return res
                .status(400)
                .json({
                    success:
                        false,

                    message:
                        "Call ID is required.",
                });
        }


        if (
            !isValidObjectId(
                callId
            )
        ) {

            return res
                .status(400)
                .json({
                    success:
                        false,

                    message:
                        "Invalid call ID.",
                });
        }


        const call =
            await getCallById(
                callId
            );


        return res.status(
            200
        ).json({

            success:
                true,

            data: {
                call,
            },

            message:
                "Call log retrieved successfully.",
        });

    } catch (error) {

        console.error(
            "Get Call Log Controller Error:",
            error
        );

        return next(
            error
        );
    }
};


/*
|--------------------------------------------------------------------------
| AI Outcome Helper
|--------------------------------------------------------------------------
*/

const getAiOutcome = (
    intent
) => {

    switch (
        intent
    ) {

        case "booking":
        case "booking_ready":
            return "Booking Created";

        case "cancel":
            return "Booking Cancelled";

        case "inquiry":
            return "Information Requested";

        default:
            return "No Action";
    }
};


/*
|--------------------------------------------------------------------------
| Default Export
|--------------------------------------------------------------------------
*/

export default {

    incomingCall,

    processCall,

    listCallLogsController,

    getCallLogController,

};

// import twilio from "twilio";
// // import { processConversation } from "../services/geminiService.js";
// import { processConversation }
//   from "../services/voice/deepseekService.js";
// // import Reservation from "../models/Reservation.js";

// const VoiceResponse = twilio.twiml.VoiceResponse;

// const sessions = new Map();

// const getSession = (caller) => {
//   if (!sessions.has(caller)) {
//     sessions.set(caller, {
//       intent: null,
//       guests: null,
//       date: null,
//       time: null,
//       name: null,
//       phone: caller,
//       confirmed: false,
//       awaitingConfirmation: false
//     });
//   }
//   return sessions.get(caller);
// };
// const updateSession = (session, data) => {

//   for (const key in data) {

//     if (
//       data[key] !== null &&
//       data[key] !== undefined
//     ) {
//       session[key] = data[key];
//     }

//   }

// };

// // const updateSession = (session, data) => {
// //   for (const key in data) {
// //     if (data[key]) {
// //       session[key] = data[key];
// //     }
// //   }
// // };

// const clearSession = (caller) => {
//   sessions.delete(caller);
// };

// /* ---------------------------------- */
// /* Incoming Call                      */
// /* ---------------------------------- */
// export const incomingCall = (req, res) => {
//   const twiml = new VoiceResponse();

//   twiml.say(
//     {
//       // voice: "alice"
//       voice: "Polly.Joanna",
//       language: "en-US",
//     },

//     "Hello, thanks for calling. How can I help you today?"
//   );

//   twiml.gather({
//     input: ["speech"],
//     action: "https://duvet-twirl-expansive.ngrok-free.dev/api/call/process",
//     method: "POST",
//     speechTimeout: "auto"
//   });

//   res.type("text/xml").send(twiml.toString());
// };

// /* ---------------------------------- */
// /* Process Call                       */
// /* ---------------------------------- */
// export const processCall = async (req, res) => {
//   const twiml = new VoiceResponse();

//   try {
//     const speechText = req.body.SpeechResult || "";
//     const caller = req.body.From || "unknown";

//     const session = getSession(caller);

//     console.log("User:", speechText);

//     /* ---------------------------------- */
//     /* Handle Confirmation Step           */
//     /* ---------------------------------- */
//     if (session.awaitingConfirmation) {
//       const reply = speechText.toLowerCase();

//       if (reply.includes("yes") || reply.includes("correct")) {
//         session.confirmed = true;
//         session.awaitingConfirmation = false;
//       } else if (reply.includes("no")) {
//         session.awaitingConfirmation = false;

//         twiml.say("No problem. What would you like to change?");

//         twiml.gather({
//           input: ["speech"],
//           action: "https://duvet-twirl-expansive.ngrok-free.dev/api/call/process",
//           method: "POST",
//           speechTimeout: "auto"
//         });

//         return res.type("text/xml").send(twiml.toString());
//       } else {
//         twiml.say("Please say yes or no.");

//         twiml.gather({
//           input: ["speech"],
//           action: "https://duvet-twirl-expansive.ngrok-free.dev/api/call/process",
//           method: "POST",
//           speechTimeout: "auto"
//         });

//         return res.type("text/xml").send(twiml.toString());
//       }
//     }

//     /* ---------------------------------- */
//     /* AI Processing                      */
//     /* ---------------------------------- */
//     const result = await processConversation(speechText, session);
//     // const result = {
//     //   intent: "booking",
//     //   guests: 2,
//     //   date: "2026-05-20",
//     //   time: "7 PM",
//     //   name: "Akash",
//     //   reply: "Sure, booking for 2 people. What time would you like?"
//     // };

//     updateSession(session, result);

//     let message = result.reply;

//     /* ---------------------------------- */
//     /* Ask Confirmation                   */
//     /* ---------------------------------- */
//     if (
//       session.intent === "booking | booking_ready | inquiry | cancel" &&
//       session.guests &&
//       session.date &&
//       session.time &&
//       session.name &&
//       !session.confirmed
//     ) {
//       session.awaitingConfirmation = true;

//       message = `Just to confirm, a table for ${session.guests} people on ${session.date} at ${session.time}. Does that sound right?`;
//     }

//     /* ---------------------------------- */
//     /* Final Booking                      */
//     /* ---------------------------------- */
//     if (
//       session.intent === "booking | booking_ready | inquiry | cancel" &&
//       session.guests &&
//       session.date &&
//       session.time &&
//       session.confirmed
//     ) {
//       await Reservation.create({
//         customerName: session.name || "Guest",
//         phone: session.phone,
//         guests: session.guests,
//         date: session.date,
//         time: session.time
//       });

//       // message = `Perfect! Your table for ${session.guests} people on ${session.date} at ${session.time} is confirmed. We look forward to serving you!`;

//       // clearSession(caller);

//       message = `Perfect! Your table for ${session.guests} people on ${session.date} at ${session.time} is confirmed. We look forward to serving you. Goodbye!`;

//       twiml.say(
//         {
//           voice: "Polly.Joanna",
//           language: "en-US"
//         },
//         message
//       );

//       twiml.hangup();

//       clearSession(caller);

//       return res.type("text/xml").send(twiml.toString());
//     }

//     /* ---------------------------------- */
//     /* Respond                            */
//     /* ---------------------------------- */
//     twiml.say({ voice: "alice" }, message);

//     twiml.gather({
//       input: ["speech"],
//       action: "https://duvet-twirl-expansive.ngrok-free.dev/api/call/process",
//       method: "POST",
//       speechTimeout: "auto"
//     });

//     res.type("text/xml").send(twiml.toString());
//   } catch (error) {
//     console.error(error);

//     twiml.say("Sorry, something went wrong.");

//     res.type("text/xml").send(twiml.toString());
//   }
// };

