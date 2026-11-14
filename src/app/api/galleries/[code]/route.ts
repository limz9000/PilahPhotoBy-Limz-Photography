import { NextResponse } from "next/server";
import { getGalleryByCode, getStudioProfile } from "@/lib/storage";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const data = await getGalleryByCode(code);

    if (!data) {
      return NextResponse.json({ error: "Galeri tidak ditemukan." }, { status: 404 });
    }

    const studio = await getStudioProfile();

    return NextResponse.json({
      gallery: data.gallery,
      photos: data.photos,
      selectedPhotoIds: data.selectedPhotoIds,
      studio,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

