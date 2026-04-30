// ─── OneApply: Referral Intelligence Score (RIS) ─────────────────────────────
// Scoring factors mirroring the OneApply RIS spec.
//
// contact = {
//   connectionDegree: 1 | 2 | 3,
//   interactionType:  "messaged" | "met" | "none",
//   sharedUniversity: bool,
//   sharedField:      bool,
//   sharedCompanyBefore: bool,
//   roleRelevance:    "company" | "team" | "senior" | "none",
//   recencyMonths:    number   (how long ago you last interacted)
// }

function computeRIS(contact) {
  let score = 0;

  // Connection Strength
  if (contact.connectionDegree === 1)      score += 50;
  else if (contact.connectionDegree === 2) score += 20;
  else                                     score +=  5;

  // Interaction History
  if (contact.interactionType === "met")      score += 20;
  else if (contact.interactionType === "messaged") score += 25;
  else                                            score -= 30;

  // Shared Context
  if (contact.sharedUniversity)    score += 20;
  if (contact.sharedField)         score += 25;
  if (contact.sharedCompanyBefore) score += 20;

  // Role Relevance (set when job is matched)
  if (contact.roleRelevance === "team")    score += 20;
  else if (contact.roleRelevance === "company") score += 30;
  else if (contact.roleRelevance === "senior")  score += 15;

  // Recency
  const months = contact.recencyMonths ?? 999;
  if (months <= 3)       score += 20;
  else if (months <= 12) score += 10;
  // >2 years → +0

  return Math.max(0, Math.min(150, score));
}

function risLabel(score) {
  if (score >= 100) return { label: "Strong Match",     cls: "ris-strong" };
  if (score >= 60)  return { label: "Warm Connection",  cls: "ris-warm"   };
  return              { label: "Not Recommended",  cls: "ris-cold"   };
}

// Make available as module-like globals
if (typeof window !== "undefined") {
  window.computeRIS = computeRIS;
  window.risLabel   = risLabel;
}
