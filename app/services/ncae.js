// app/services/ncae.js
import "server-only";

import { downloadJsonFromStorage, uploadJsonToStorage } from "@/app/services/storage-json";

export const NCAE_BUCKET = process.env.NCAE_BUCKET || "ncae-preassessment-data";
export const NCAE_PATH = process.env.NCAE_PATH || "questionnaire.json";

export async function getNcaeQuestionnaire() {
  const data = await downloadJsonFromStorage({
    bucket: NCAE_BUCKET,
    path: NCAE_PATH,
    defaultValue: [], // missing file => []
  });

  return {
    bucket: NCAE_BUCKET,
    path: NCAE_PATH,
    data: Array.isArray(data) ? data : [],
  };
}

export async function saveNcaeQuestionnaire(ncaeArray) {
  const payload = Array.isArray(ncaeArray) ? ncaeArray : [];

  await uploadJsonToStorage({
    bucket: NCAE_BUCKET,
    path: NCAE_PATH,
    data: payload,
    upsert: true,
    cacheControl: "no-store",
    ensureBucket: true,
  });

  return {
    bucket: NCAE_BUCKET,
    path: NCAE_PATH,
    data: payload,
  };
}
