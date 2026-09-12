const PHONE_KEYS = [
  "sip.phoneNumber",
  "caller.phone",
  "phoneNumber",
];

const normalizePhone = (value) => {
  if (value === undefined || value === null) return "";
  const raw = String(value).trim();
  if (!raw) return "";
  const compact = raw.replace(/[\s().-]/g, "");
  if (/^\+\d{8,15}$/.test(compact)) return compact;
  // Accept provider values with a leading 00 international prefix.
  if (/^00\d{8,15}$/.test(compact)) return `+${compact.slice(2)}`;
  return "";
};

export const extractCallerPhone = (participant) => {
  const attributes = participant?.attributes || {};

  for (const key of PHONE_KEYS) {
    const value = normalizePhone(attributes[key]);
    if (value) return value;
  }

  // A provider can also forward a trusted caller phone in participant metadata.
  if (participant?.metadata) {
    try {
      const metadata = JSON.parse(participant.metadata);
      const metadataPhone = normalizePhone(
        metadata?.callerPhone || metadata?.phone || metadata?.from
      );
      if (metadataPhone) return metadataPhone;
    } catch {
      // Ignore non-JSON metadata; SIP attributes remain the preferred source.
    }
  }

  // Do not trust an arbitrary WebRTC identity as a phone number. Only accept
  // an identity when it is already an E.164-like phone number.
  return normalizePhone(participant?.identity);
};

export const maskPhone = (phone) => {
  const value = normalizePhone(phone);
  if (!value) return "unavailable";
  if (value.length <= 6) return `${value.slice(0, 2)}***`;
  return `${value.slice(0, 3)}***${value.slice(-2)}`;
};

export { normalizePhone };
