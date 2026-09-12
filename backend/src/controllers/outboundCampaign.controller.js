import { parseContactsFile, createCampaign, listCampaigns, startCampaign, cancelCampaign } from "../services/outboundCampaign.service.js";
import { parsePositiveInt, parseString, sendError, sendSuccess, logControllerError, isObjectId } from "./_controllerUtils.js";
const providers = ["twilio", "exotel", "vobiz"];

export const previewCampaign = async (req, res, next) => {
  try {
    if (!req.file) return sendError(res, { status: 400, message: "Upload a CSV, XLSX or XLSM file." });
    const contacts = await parseContactsFile(req.file);
    return sendSuccess(res, { data: { total: contacts.length, preview: contacts.slice(0, 100) }, message: `Parsed ${contacts.length} valid contacts.` });
  } catch (error) { logControllerError("CAMPAIGN_PREVIEW", error, req); return next(error); }
};

export const createCampaignController = async (req, res, next) => {
  try {
    if (!req.file) return sendError(res, { status: 400, message: "Upload a CSV, XLSX or XLSM file." });
    const name = parseString(req.body?.name || "Outbound campaign").slice(0, 150);
    const provider = parseString(req.body?.provider).toLowerCase();
    if (!providers.includes(provider)) return sendError(res, { status: 400, message: "Choose Twilio, Exotel or Vobiz." });
    const contacts = await parseContactsFile(req.file);
    if (!contacts.length) return sendError(res, { status: 400, message: "No valid E.164 phone numbers were found in the file." });
    const campaign = await createCampaign({ name, provider, messageTemplate: parseString(req.body?.messageTemplate).slice(0, 2000), contacts, concurrency: parsePositiveInt(req.body?.concurrency, 2, 10), createdBy: req.user?._id });
    return sendSuccess(res, { status: 201, data: campaign, message: "Outbound campaign created." });
  } catch (error) { logControllerError("CAMPAIGN_CREATE", error, req); return next(error); }
};

export const listCampaignsController = async (req, res, next) => {
  try { const data = await listCampaigns({ page: parsePositiveInt(req.query?.page, 1, 100000), limit: parsePositiveInt(req.query?.limit, 20, 100) }); return sendSuccess(res, { data: data.campaigns, meta: { total: data.total, page: data.page, limit: data.limit, totalPages: data.totalPages }, message: "Outbound campaigns retrieved." }); }
  catch (error) { logControllerError("CAMPAIGN_LIST", error, req); return next(error); }
};
export const startCampaignController = async (req, res, next) => {
  try { if (!isObjectId(req.params?.id)) return sendError(res, { status: 400, message: "Invalid campaign ID." }); const campaign = await startCampaign(req.params.id); return sendSuccess(res, { data: campaign, message: "Campaign started." }); }
  catch (error) { logControllerError("CAMPAIGN_START", error, req); return next(error); }
};
export const cancelCampaignController = async (req, res, next) => {
  try { if (!isObjectId(req.params?.id)) return sendError(res, { status: 400, message: "Invalid campaign ID." }); const campaign = await cancelCampaign(req.params.id); if (!campaign) return sendError(res, { status: 404, message: "Campaign not found." }); return sendSuccess(res, { data: campaign, message: "Campaign cancelled." }); }
  catch (error) { logControllerError("CAMPAIGN_CANCEL", error, req); return next(error); }
};

export default { previewCampaign, createCampaignController, listCampaignsController, startCampaignController, cancelCampaignController };
