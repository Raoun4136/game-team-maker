import { createHmac, timingSafeEqual } from "node:crypto";

type UnlockTokenInput = {
  groupSlug: string;
  expiresAt: Date;
  secret: string;
};

type UnlockValidationInput = {
  token: string;
  groupSlug: string;
  now?: Date;
  secret: string;
};

function signUnlockPayload(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function createUnlockToken(input: UnlockTokenInput) {
  const payload = `${input.groupSlug}|${input.expiresAt.toISOString()}`;
  const signature = signUnlockPayload(payload, input.secret);

  return `${payload}|${signature}`;
}

export function isValidUnlockToken(input: UnlockValidationInput) {
  const [tokenSlug, expiresAtIso, signature] = input.token.split("|");

  if (!tokenSlug || !expiresAtIso || !signature) {
    return false;
  }

  if (tokenSlug !== input.groupSlug) {
    return false;
  }

  const expiresAt = new Date(expiresAtIso);
  const now = input.now ?? new Date();

  if (Number.isNaN(expiresAt.getTime()) || now.getTime() >= expiresAt.getTime()) {
    return false;
  }

  const payload = `${tokenSlug}|${expiresAtIso}`;
  const expectedSignature = signUnlockPayload(payload, input.secret);

  return timingSafeEqual(
    Buffer.from(signature, "utf8"),
    Buffer.from(expectedSignature, "utf8"),
  );
}

export function readUnlockTokenExpiresAt(token: string, groupSlug: string) {
  const [tokenSlug, expiresAtIso] = token.split("|");

  if (!tokenSlug || !expiresAtIso || tokenSlug !== groupSlug) {
    return null;
  }

  const expiresAt = new Date(expiresAtIso);

  if (Number.isNaN(expiresAt.getTime())) {
    return null;
  }

  return expiresAt;
}
