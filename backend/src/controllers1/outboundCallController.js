import twilio from "twilio";
import env from "../config/env.js";

const client = twilio(
    env.twilioAccountSid,
    env.twilioAuthToken
);

export const makeOutboundCall = async (req, res) => {

    try {


        const call = await client.calls.create({

            to:"+917068311385",

            from:"+17179428649",

            url:
            `${env.baseUrl}/api/outbound/connect-livekit`,

            method:"POST"

        });

        // const call = await client.calls.create({
        //     to: "+919696645492",
        //     // from: "+15304576180",
        //     from: "+17372212163",
        //     url: `${env.baseUrl}/api/outbound/connect-livekit`
        // });

        // console.log(call.sid);



        res.json({

            success: true,

            callSid: call.sid

        });



    } catch (error) {

        console.log(error);

        res.status(500).json({

            success: false,

            error: error.message

        });

    }

};


export const connectLivekit = (req, res) => {


    const VoiceResponse = twilio.twiml.VoiceResponse;


    const twiml = new VoiceResponse();



    const dial = twiml.dial({

        answerOnBridge: true

    });

    // dial.sip("sip:+16814122238@2n5ui124tl0.sip.livekit.cloud");
    dial.sip("sip:+17179428649@2n5ui124tl0.sip.livekit.cloud");

    res
        .type("text/xml")
        .send(
            twiml.toString()
        );
};

