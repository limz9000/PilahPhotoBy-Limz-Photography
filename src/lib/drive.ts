import { DriveParsedFile } from "./types";

/**
 * Extracts Google Drive folder ID from various URL formats
 */
export function extractDriveFolderId(url: string): string | null {
  if (!url) return null;
  const clean = url.trim();

  // Pattern 1: drive.google.com/drive/folders/ID
  const matchFolder = clean.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (matchFolder) return matchFolder[1];

  // Pattern 2: drive.google.com/open?id=ID or ?id=ID
  const matchIdParam = clean.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (matchIdParam) return matchIdParam[1];

  // Pattern 3: Raw ID string (typically 25-45 characters alphanumeric)
  if (/^[a-zA-Z0-9_-]{20,}$/.test(clean)) {
    return clean;
  }

  return null;
}

/**
 * Generates direct Google CDN thumbnail URL (Zero Server Upload)
 * Size parameters: w400, w800, w1600, w2400
 */
export function getDriveThumbnailUrl(fileId: string, width = 800): string {
  return `https://lh3.googleusercontent.com/d/${fileId}=w${width}`;
}

/**
 * Generates direct full-res Google Drive view link
 */
export function getDriveDirectViewUrl(fileId: string): string {
  return `https://drive.google.com/uc?export=view&id=${fileId}`;
}

// Google Apps Script Drive Scanner Engine (Sama seperti yang digunakan Pilihin.app)
const GAS_SCANNER_URL =
  process.env.GAS_DRIVE_SCANNER_URL ||
  "https://script.google.com/macros/s/AKfycbxo0QwfDtbRwANqP_989j3-LJtRtsEZ6QCW5aaHQVvb4AXWfR2Zv18QHP6WKoraNu_I/exec";

function parseJsonpOrJson(text: string): any {
  const clean = text.trim();
  const match = clean.match(/^\s*\w+\s*\(([\s\S]*)\)\s*;?\s*$/);
  if (match) {
    return JSON.parse(match[1]);
  }
  return JSON.parse(clean);
}

/**
 * Parses files from a public Google Drive folder
 */
export async function parseDriveFolder(
  folderIdOrUrl: string
): Promise<{ folderName?: string; files: DriveParsedFile[] }> {
  const folderId = extractDriveFolderId(folderIdOrUrl) || folderIdOrUrl;
  const fullDriveLink = folderIdOrUrl.startsWith("http")
    ? folderIdOrUrl
    : `https://drive.google.com/drive/folders/${folderId}`;

  // METODE 1: Google Apps Script Native Drive Scanner (Metode Resmi Pilihin)
  // Menembus proteksi Google Drive tanpa butuh OAuth/GCP Console yang rumit
  try {
    const scannerEndpoint = `${GAS_SCANNER_URL}?folder=${encodeURIComponent(fullDriveLink)}`;
    const gasRes = await fetch(scannerEndpoint, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      next: { revalidate: 60 },
    });

    if (gasRes.ok) {
      const rawText = await gasRes.text();
      const payload = parseJsonpOrJson(rawText);

      if (payload.status === "ok" && Array.isArray(payload.photos) && payload.photos.length > 0) {
        const files: DriveParsedFile[] = payload.photos.map((p: any) => ({
          id: p.id,
          name: p.name || `FOTO_${p.id}.JPG`,
          thumbnailUrl: getDriveThumbnailUrl(p.id, 800),
          width: p.w || 1600,
          height: p.h || 1067,
        }));

        return {
          folderName: payload.folderName || "Galeri Google Drive",
          files: files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })),
        };
      }

      if (payload.status === "error") {
        throw new Error(payload.error || "Folder Google Drive tidak dapat dibuka.");
      }
    }
  } catch (err: any) {
    if (err.message && err.message.includes("Folder")) {
      throw err;
    }
    console.warn("GAS scanner warning, trying backup methods:", err.message);
  }

  // METODE 2: Google Drive API v3 (Jika API Key valid disetel)
  const apiKey = process.env.GOOGLE_DRIVE_API_KEY?.trim()?.replace(/^["']|["']$/g, "");
  if (apiKey) {
    try {
      const endpoint = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+trashed=false&key=${apiKey}&fields=files(id,name,mimeType,imageMediaMetadata)&pageSize=1000&orderBy=name`;
      const res = await fetch(endpoint);

      if (res.ok) {
        const data = await res.json();
        const rawFiles: any[] = data.files || [];
        const imageFiles = rawFiles.filter(
          (f) =>
            f.mimeType?.startsWith("image/") ||
            /\.(jpg|jpeg|png|webp|JPG|JPEG|PNG)$/i.test(f.name)
        );

        if (imageFiles.length > 0) {
          return {
            folderName: "Google Drive Folder",
            files: imageFiles.map((f) => ({
              id: f.id,
              name: f.name,
              thumbnailUrl: getDriveThumbnailUrl(f.id, 800),
              width: f.imageMediaMetadata?.width || 1600,
              height: f.imageMediaMetadata?.height || 1067,
            })),
          };
        }
      }
    } catch (apiErr) {
      console.warn("Google Drive API v3 fallback error:", apiErr);
    }
  }

  // Jika semua metode di atas belum berhasil, lempar error panduan ke pengguna
  throw new Error(
    "Folder Google Drive tidak bisa dibuka. Pastikan folder sudah di-set 'Siapa saja yang memiliki link' (Publik) di Google Drive, lalu coba lagi."
  );
}

/**
 * Sample photography set for testing & demonstration
 */
export function generateDemoPhotos(): DriveParsedFile[] {
  const sampleImages = [
    { id: "demo-1", name: "LIMZ_0102.JPG", url: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80", w: 1600, h: 1067 },
    { id: "demo-2", name: "LIMZ_0105.JPG", url: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1200&q=80", w: 1600, h: 1067 },
    { id: "demo-3", name: "LIMZ_0110.JPG", url: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=1200&q=80", w: 1067, h: 1600 },
    { id: "demo-4", name: "LIMZ_0114.JPG", url: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1200&q=80", w: 1600, h: 1067 },
    { id: "demo-5", name: "LIMZ_0120.JPG", url: "https://images.unsplash.com/photo-1606800052052-a08af7148866?auto=format&fit=crop&w=1200&q=80", w: 1600, h: 1067 },
    { id: "demo-6", name: "LIMZ_0125.JPG", url: "https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=1200&q=80", w: 1067, h: 1600 },
  ];

  return sampleImages.map((img) => ({
    id: img.id,
    name: img.name,
    thumbnailUrl: img.url,
    width: img.w,
    height: img.h,
  }));
}
