import { NextRequest, NextResponse } from "next/server";

// Server-side In-Memory Cache (LRU-like, max 250 images)
const imageCache = new Map<string, { buffer: ArrayBuffer; contentType: string; timestamp: number }>();
const MAX_CACHE_ITEMS = 250;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const width = searchParams.get("w") || "800";

  if (!id) {
    return new NextResponse("Missing file id parameter", { status: 400 });
  }

  const cacheKey = `${id}_w${width}`;

  // Check cache first
  const cached = imageCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return new NextResponse(cached.buffer, {
      headers: {
        "Content-Type": cached.contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        "X-Proxy-Cache": "HIT",
      },
    });
  }

  const userAgent =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

  // Tiered URLs to guarantee 100% resolution
  const candidateUrls = [
    `https://lh3.googleusercontent.com/d/${id}=w${width}`,
    `https://drive.google.com/thumbnail?id=${id}&sz=w${width}`,
    `https://drive.usercontent.google.com/download?id=${id}&export=view`,
    `https://drive.google.com/uc?export=view&id=${id}`,
  ];

  for (const url of candidateUrls) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": userAgent,
          Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        },
      });

      if (res.ok) {
        const contentType = res.headers.get("Content-Type") || "image/jpeg";
        // Avoid caching html error pages
        if (contentType.includes("image")) {
          const arrayBuffer = await res.arrayBuffer();

          // Save to cache
          if (imageCache.size >= MAX_CACHE_ITEMS) {
            const firstKey = imageCache.keys().next().value;
            if (firstKey) imageCache.delete(firstKey);
          }
          imageCache.set(cacheKey, {
            buffer: arrayBuffer,
            contentType,
            timestamp: Date.now(),
          });

          return new NextResponse(arrayBuffer, {
            headers: {
              "Content-Type": contentType,
              "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
              "X-Proxy-Cache": "MISS",
            },
          });
        }
      }
    } catch {
      // Continue to next candidate URL
    }
  }

  return new NextResponse("Image not accessible from Google Drive", { status: 404 });
}
