import { NextResponse } from "next/server";
import { getGalleryByCode, submitGallerySelections } from "@/lib/storage";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const data = await getGalleryByCode(code);
    if (!data) {
      return NextResponse.json({ error: "Galeri tidak ditemukan." }, { status: 404 });
    }

    await submitGallerySelections(data.gallery.id);

    return NextResponse.json({ success: true, message: "Pilihan foto berhasil dikirim dan galeri telah dikunci." });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

