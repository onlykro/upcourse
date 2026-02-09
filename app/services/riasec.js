// app/services/riasec.js
import "server-only";

import { downloadJsonFromStorage, uploadJsonToStorage } from "@/app/services/storage-json";

export const RIASEC_BUCKET = process.env.RIASEC_BUCKET || "riasec-test";
export const RIASEC_PATH = process.env.RIASEC_PATH || "items.json";

export const DEFAULT_RIASEC = {
  version: 1,
  scale_min: 1,
  scale_max: 5,
  likert_labels: ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"],
  items: [],
};

export async function getRiasecItems() {
  const data = await downloadJsonFromStorage({
    bucket: RIASEC_BUCKET,
    path: RIASEC_PATH,
    defaultValue: DEFAULT_RIASEC,
  });

  const safe =
    data && typeof data === "object" && !Array.isArray(data)
      ? data
      : DEFAULT_RIASEC;

  return {
    bucket: RIASEC_BUCKET,
    path: RIASEC_PATH,
    data: safe,
  };
}

export async function saveRiasecItems(riasecObject) {
  const payload =
    riasecObject && typeof riasecObject === "object" && !Array.isArray(riasecObject)
      ? riasecObject
      : DEFAULT_RIASEC;

  await uploadJsonToStorage({
    bucket: RIASEC_BUCKET,
    path: RIASEC_PATH,
    data: payload,
    upsert: true,
    cacheControl: "no-store",
    ensureBucket: true,
  });

  return {
    bucket: RIASEC_BUCKET,
    path: RIASEC_PATH,
    data: payload,
  };
}
