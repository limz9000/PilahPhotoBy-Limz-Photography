import { NextResponse } from "next/server";
import { getGalleryByCode, updatePhotoNote } from "@/lib/storage";

interface Props {
  params: Promise<{ code: string }>;
}

export async function POST(req: Request, { params }: Props) {
  try {
    const { code } = await params;
    const { photoId, notes } = await req.json();

    if (!photoId) {
      return NextResponse.json({ error: "photoId wajib disertakan" }, { status: 400 });
    }

    const galleryData = await getGalleryByCode(code);
    if (!galleryData) {
      return NextResponse.json({ error: "Galeri tidak ditemukan" }, { status: 404 });
    }

    if (galleryData.gallery.status === "submitted") {
      return NextResponse.json(
        { error: "Galeri sudah dikunci permanen. Catatan tidak dapat diubah." },
        { status: 403 }
      );
    }

    const res = await updatePhotoNote(galleryData.gallery.id, photoId, notes || "");
    return NextResponse.json(res);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

