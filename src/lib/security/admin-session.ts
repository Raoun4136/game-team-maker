import { createHmac, timingSafeEqual } from "node:crypto";

type AdminSessionTokenInput = {
  username: string;
  expiresAt: Date;
  secret: string;
};

type AdminSessionValidationInput = {
  token: string;
  username: string;
  now?: Date;
  secret: string;
};

type AdminCredentialInput = {
  expectedUsername: string;
  expectedPassword: string;
  username: string;
  password: string;
};

function signAdminPayload(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

function safeCompare(left: string, right: string) {
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function buildAdminSessionExpiresAt(minutes: number, now = new Date()) {
  return new Date(now.getTime() + minutes * 60 * 1000);
}

export function createAdminSessionToken(input: AdminSessionTokenInput) {
  const payload = `${input.username}|${input.expiresAt.toISOString()}`;
  const signature = signAdminPayload(payload, input.secret);

  return `${payload}|${signature}`;
}

export function isValidAdminSessionToken(input: AdminSessionValidationInput) {
  const [tokenUsername, expiresAtIso, signature] = input.token.split("|");

  if (!tokenUsername || !expiresAtIso || !signature) {
    return false;
  }

  if (tokenUsername !== input.username) {
    return false;
  }

  const expiresAt = new Date(expiresAtIso);
  const now = input.now ?? new Date();

  if (Number.isNaN(expiresAt.getTime()) || now.getTime() >= expiresAt.getTime()) {
    return false;
  }

  const payload = `${tokenUsername}|${expiresAtIso}`;
  const expectedSignature = signAdminPayload(payload, input.secret);

  return safeCompare(signature, expectedSignature);
}

export function verifyAdminCredentials(input: AdminCredentialInput) {
  return (
    safeCompare(input.expectedUsername, input.username) &&
    safeCompare(input.expectedPassword, input.password)
  );
}
