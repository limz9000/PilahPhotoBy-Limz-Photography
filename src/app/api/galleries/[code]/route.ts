import { NextResponse } from "next/server";
import { getGalleryByCode, getStudioProfile, deleteGallery, unlockGallery } from "@/lib/storage";

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

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const data = await getGalleryByCode(code);
    if (!data) {
      return NextResponse.json({ error: "Galeri tidak ditemukan." }, { status: 404 });
    }

    await deleteGallery(data.gallery.id);
    return NextResponse.json({ success: true, message: "Galeri berhasil dihapus." });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const data = await getGalleryByCode(code);
    if (!data) {
      return NextResponse.json({ error: "Galeri tidak ditemukan." }, { status: 404 });
    }

    await unlockGallery(data.gallery.id);
    return NextResponse.json({ success: true, message: "Galeri berhasil dibuka kembali." });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
