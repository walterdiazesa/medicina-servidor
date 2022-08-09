import { validate as isDeepEmail } from "deep-email-validator-extended";
import { EXCLUDED_EMAIL_DOMAINS, REGEX_EMAIL } from "./constants";

export const isValidEmail = async (
  email: string,
  deep?: boolean
): Promise<boolean> => {
  if (!deep) return REGEX_EMAIL.test(String(email).toLowerCase());

  if (
    !REGEX_EMAIL.test(String(email).toLowerCase()) ||
    (!["outlook.com", "gmail.com"].some((ext) => email.endsWith(ext)) &&
      EXCLUDED_EMAIL_DOMAINS.some((ext) => email.endsWith(ext)))
  )
    return false;

  const isValidEmail = await isDeepEmail({
    email,
    validateRegex: false,
    validateMx: true,
    validateTypo: true,
    validateDisposable: false,
    validateSMTP: process.env.NODE_ENV.trim() !== "DEV",
  });

  return isValidEmail.valid;
};
