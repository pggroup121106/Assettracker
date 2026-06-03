import {
  driveDownloadUrl,
  driveViewUrl,
  extractDriveFileId,
  toDriveDirectUrl,
} from "./driveUrls.js";

export type FetchedFile = {
  bytes: Uint8Array;
  contentType: string;
};

function isPdfBytes(bytes: Uint8Array): boolean {
  return (
    bytes.length > 4 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46
  );
}

function isPngBytes(bytes: Uint8Array): boolean {
  return bytes.length > 3 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
}

function isJpegBytes(bytes: Uint8Array): boolean {
  return bytes.length > 2 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

function extractDriveConfirmToken(html: string): string | null {
  const patterns = [
    /confirm=([0-9A-Za-z_\-]+)/,
    /confirm=([0-9A-Za-z_\-]{4,})/,
    /id="download-form"[^>]*action="[^"]*confirm=([0-9A-Za-z_\-]+)/,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return m[1];
  }
  if (html.includes("virus scan") || html.includes("download_warning")) return "t";
  return null;
}

async function fetchWithRedirects(url: string, maxRedirects = 8): Promise<Response> {
  let current = url;
  for (let i = 0; i < maxRedirects; i++) {
    const res = await fetch(current, {
      redirect: "manual",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; AssestFlow/1.0)" },
    });
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) return res;
      current = loc.startsWith("http") ? loc : new URL(loc, current).toString();
      continue;
    }
    return res;
  }
  return fetch(current, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; AssestFlow/1.0)" },
  });
}

async function fetchUrlOnce(url: string): Promise<FetchedFile | null> {
  let res = await fetchWithRedirects(url);
  if (!res.ok) return null;

  let contentType = res.headers.get("content-type") || "";
  let bytes = new Uint8Array(await res.arrayBuffer());

  if (contentType.includes("text/html") && bytes.length > 0 && !isPdfBytes(bytes)) {
    const html = new TextDecoder().decode(bytes.slice(0, 200000));
    const confirm = extractDriveConfirmToken(html);
    const fileId = extractDriveFileId(url);
    if (confirm && fileId) {
      const retryUrl = `${driveDownloadUrl(fileId)}&confirm=${confirm}`;
      res = await fetchWithRedirects(retryUrl);
      if (!res.ok) return null;
      contentType = res.headers.get("content-type") || "";
      bytes = new Uint8Array(await res.arrayBuffer());
    }
  }

  if (bytes.length === 0) return null;
  if (isPdfBytes(bytes)) contentType = "application/pdf";
  else if (isPngBytes(bytes)) contentType = "image/png";
  else if (isJpegBytes(bytes)) contentType = "image/jpeg";
  
  if (contentType.includes("text/html")) return null;
  
  return { bytes, contentType };
}

/**
 * Fetch file bytes from Google Drive or any HTTP(S) URL.
 * Tries view URL first (better for PDF inline), then download URL.
 */
export async function fetchRemoteFile(url: string): Promise<FetchedFile | null> {
  try {
    const trimmed = (url || "").trim();
    if (!trimmed) return null;

    const fileId = extractDriveFileId(trimmed);
    
    // First try: Fetch via Google Apps Script (100% reliable for Drive files in owner's account)
    if (fileId && process.env.GAS_WEBAPP_URL) {
      try {
        console.log(`Attempting to fetch Drive file ${fileId} via GAS...`);
        const response = await fetch(process.env.GAS_WEBAPP_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "get_file_base64", fileId }),
        });
        const data = (await response.json()) as any;
        if (data && data.success && data.base64) {
          console.log(`GAS fetch successful for file ${fileId}`);
          const bytes = Buffer.from(data.base64, "base64");
          return {
            bytes: new Uint8Array(bytes),
            contentType: data.mimeType || "application/octet-stream",
          };
        }
        console.warn(`GAS fetch failed or returned unsuccessful for file ${fileId}:`, data);
      } catch (err) {
        console.warn(`GAS fetch error for file ${fileId}:`, err);
      }
    }

    // Fallbacks
    const attempts: string[] = [];
    if (fileId) {
      attempts.push(driveDownloadUrl(fileId), driveViewUrl(fileId));
    }
    attempts.push(toDriveDirectUrl(trimmed), trimmed);

    for (const attempt of attempts) {
      const data = await fetchUrlOnce(attempt);
      if (data) return data;
    }
    return null;
  } catch (err) {
    console.warn("fetchRemoteFile failed:", err);
    return null;
  }
}
