export const highLevelConsentVersion = "2026-11-13";

export function isBusinessRequest(type) {
  return type === "listing" || type === "partner-campaign";
}
