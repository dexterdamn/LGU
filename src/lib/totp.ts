import { authenticator } from "otplib";
import QRCode from "qrcode";

authenticator.options = {
  window: 2, // Grace period: accept codes from 2 periods before/after (120 seconds total)
};

export function generateTotpSecret(): string {
  return authenticator.generateSecret();
}

export function verifyTotpToken(token: string, secret: string): boolean {
  try {
    return authenticator.verify({ token, secret });
  } catch {
    return false;
  }
}

export async function generateQrCodeDataUrl(
  email: string,
  secret: string
): Promise<string> {
  const issuer = process.env.TOTP_ISSUER || "GADFS Data Entry";
  const otpauth = authenticator.keyuri(email, issuer, secret);
  return QRCode.toDataURL(otpauth);
}

export function getTotpUri(email: string, secret: string): string {
  const issuer = process.env.TOTP_ISSUER || "GADFS Data Entry";
  return authenticator.keyuri(email, issuer, secret);
}
