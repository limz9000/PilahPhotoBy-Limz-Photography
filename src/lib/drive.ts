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

/**
 * Parses files from a public Google Drive folder
 */
export async function parseDriveFolder(folderId: string): Promise<DriveParsedFile[]> {
  const apiKey = process.env.GOOGLE_DRIVE_API_KEY;

  // Method 1: Google Drive API v3 (if API key is supplied)
  if (apiKey) {
    try {
      const endpoint = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+trashed=false&key=${apiKey}&fields=files(id,name,mimeType,imageMediaMetadata)&pageSize=500&orderBy=name`;
      const res = await fetch(endpoint);
      if (res.ok) {
        const data = await res.json();
        const files: DriveParsedFile[] = (data.files || [])
          .filter((f: any) => f.mimeType?.startsWith("image/"))
          .map((f: any) => ({
            id: f.id,
            name: f.name,
            thumbnailUrl: getDriveThumbnailUrl(f.id, 800),
            width: f.imageMediaMetadata?.width || 1600,
            height: f.imageMediaMetadata?.height || 1067,
          }));
        if (files.length > 0) return files;
      }
    } catch (err) {
      console.warn("Google Drive API failed, falling back to public HTML parser:", err);
    }
  }

  // Method 2: Public Folder HTML Scraping
  try {
    const publicUrl = `https://drive.google.com/embeddedfolderview?id=${folderId}#grid`;
    const res = await fetch(publicUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (res.ok) {
      const html = await res.text();
      const files: DriveParsedFile[] = [];
      const seen = new Set<string>();

      // Regex matches file ID and title in Google Drive embedded view
      const fileRegex = /\["([a-zA-Z0-9_-]{28,})","([^"]+\.(?:jpg|jpeg|png|webp|JPG|JPEG|PNG))"/g;
      let match;
      while ((match = fileRegex.exec(html)) !== null) {
        const [, fileId, fileName] = match;
        if (!seen.has(fileId)) {
          seen.add(fileId);
          files.push({
            id: fileId,
            name: fileName,
            thumbnailUrl: getDriveThumbnailUrl(fileId, 800),
            width: 1600,
            height: 1067,
          });
        }
      }

      if (files.length > 0) {
        return files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
      }
    }
  } catch (err) {
    console.warn("Public folder scraping failed:", err);
  }

  // Method 3: Fallback high-quality photography sample images for demonstration
  return generateDemoPhotos();
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
    { id: "demo-7", name: "LIMZ_0132.JPG", url: "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=1200&q=80", w: 1600, h: 1067 },
    { id: "demo-8", name: "LIMZ_0140.JPG", url: "https://images.unsplash.com/photo-1544077960-604201fe74bc?auto=format&fit=crop&w=1200&q=80", w: 1067, h: 1600 },
    { id: "demo-9", name: "LIMZ_0145.JPG", url: "https://images.unsplash.com/photo-1532712938310-34cb3982ef74?auto=format&fit=crop&w=1200&q=80", w: 1600, h: 1067 },
    { id: "demo-10", name: "LIMZ_0152.JPG", url: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1200&q=80", w: 1600, h: 1067 },
    { id: "demo-11", name: "LIMZ_0160.JPG", url: "https://images.unsplash.com/photo-1545232979-8bf68ee9b1af?auto=format&fit=crop&w=1200&q=80", w: 1600, h: 1067 },
    { id: "demo-12", name: "LIMZ_0168.JPG", url: "https://images.unsplash.com/photo-1469371670807-013ccf25f16a?auto=format&fit=crop&w=1200&q=80", w: 1067, h: 1600 },
  ];

  return sampleImages.map((img) => ({
    id: img.id,
    name: img.name,
    thumbnailUrl: img.url,
    width: img.w,
    height: img.h,
  }));
}

