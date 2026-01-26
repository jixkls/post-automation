// Storage helpers with local filesystem fallback
// Uses local storage when BUILT_IN_FORGE_API_URL is not a valid storage endpoint

import { ENV } from './_core/env';
import * as fs from 'fs';
import * as path from 'path';

type StorageConfig = { baseUrl: string; apiKey: string };

type StorageApiResponse = {
  url?: string;
};

function getStorageConfig(): StorageConfig {
  const baseUrl = ENV.forgeApiUrl;
  const apiKey = ENV.forgeApiKey;

  if (!baseUrl || !apiKey) {
    throw new Error(
      "Storage proxy credentials missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY"
    );
  }

  return { baseUrl: baseUrl.replace(/\/+$/, ""), apiKey };
}

function buildUploadUrl(baseUrl: string, relKey: string): URL {
  const url = new URL("v1/storage/upload", ensureTrailingSlash(baseUrl));
  url.searchParams.set("path", normalizeKey(relKey));
  return url;
}

async function buildDownloadUrl(
  baseUrl: string,
  relKey: string,
  apiKey: string
): Promise<string> {
  const downloadApiUrl = new URL(
    "v1/storage/downloadUrl",
    ensureTrailingSlash(baseUrl)
  );
  downloadApiUrl.searchParams.set("path", normalizeKey(relKey));
  const response = await fetch(downloadApiUrl, {
    method: "GET",
    headers: buildAuthHeaders(apiKey),
  });

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(
      `Storage download URL request failed (${response.status} ${response.statusText}): ${message}`
    );
  }

  const data = (await response.json()) as StorageApiResponse;
  if (!data.url) {
    throw new Error("Storage API returned response without URL");
  }
  return data.url;
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function toFormData(
  data: Buffer | Uint8Array | string,
  contentType: string,
  fileName: string
): FormData {
  const blob =
    typeof data === "string"
      ? new Blob([data], { type: contentType })
      : new Blob([new Uint8Array(data)], { type: contentType });
  const form = new FormData();
  form.append("file", blob, fileName || "file");
  return form;
}

function buildAuthHeaders(apiKey: string): HeadersInit {
  return { Authorization: `Bearer ${apiKey}` };
}

// Local storage directory for generated files
const LOCAL_STORAGE_DIR = path.join(process.cwd(), 'public', 'uploads');

// Ensure local storage directory exists
function ensureLocalStorageDir(): void {
  if (!fs.existsSync(LOCAL_STORAGE_DIR)) {
    fs.mkdirSync(LOCAL_STORAGE_DIR, { recursive: true });
  }
}

// Check if storage proxy is available (not just Gemini API URL)
function isStorageProxyAvailable(): boolean {
  const { baseUrl } = getStorageConfig();
  // If the URL contains 'generativelanguage' or 'googleapis', it's not a storage proxy
  return !baseUrl.includes('generativelanguage') && !baseUrl.includes('aiplatform');
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);

  // Use local storage if storage proxy is not available
  if (!isStorageProxyAvailable()) {
    ensureLocalStorageDir();
    const fileName = key.split("/").pop() ?? `file-${Date.now()}`;
    const filePath = path.join(LOCAL_STORAGE_DIR, fileName);

    // Convert data to Buffer if needed
    const buffer = typeof data === 'string'
      ? Buffer.from(data)
      : Buffer.from(data);

    fs.writeFileSync(filePath, buffer);

    // Return URL relative to server (will be served as static file)
    const url = `/uploads/${fileName}`;
    return { key, url };
  }

  // Use remote storage proxy
  const { baseUrl, apiKey } = getStorageConfig();
  const uploadUrl = buildUploadUrl(baseUrl, key);
  const formData = toFormData(data, contentType, key.split("/").pop() ?? key);
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: buildAuthHeaders(apiKey),
    body: formData,
  });

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(
      `Storage upload failed (${response.status} ${response.statusText}): ${message}`
    );
  }
  const responseData = (await response.json()) as StorageApiResponse;
  if (!responseData.url) {
    throw new Error("Storage API upload returned response without URL");
  }
  return { key, url: responseData.url };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string; }> {
  const { baseUrl, apiKey } = getStorageConfig();
  const key = normalizeKey(relKey);
  return {
    key,
    url: await buildDownloadUrl(baseUrl, key, apiKey),
  };
}
