import { NextResponse } from "next/server";
import { getGalleryByCode, togglePhotoSelection } from "@/lib/storage";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const { photoId } = await req.json();

    if (!photoId) {
      return NextResponse.json({ error: "Photo ID diperlukan." }, { status: 400 });
    }

    const data = await getGalleryByCode(code);
    if (!data) {
      return NextResponse.json({ error: "Galeri tidak ditemukan." }, { status: 404 });
    }

    const result = await togglePhotoSelection(data.gallery.id, photoId);

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

