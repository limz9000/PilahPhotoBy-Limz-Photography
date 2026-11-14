import { NextResponse } from "next/server";
import { createGallery, listGalleries } from "@/lib/storage";

export async function GET() {
  try {
    const galleries = await listGalleries();
    return NextResponse.json({ galleries });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, client_name, drive_folder_url, drive_folder_id, max_selection, deadline_date, files } = body;

    if (!title || !client_name || !drive_folder_url || !files || files.length === 0) {
      return NextResponse.json(
        { error: "Mohon lengkapi judul, nama klien, tautan Drive, dan pastikan foto berhasil dibaca." },
        { status: 400 }
      );
    }

    const gallery = await createGallery({
      title,
      client_name,
      drive_folder_url,
      drive_folder_id,
      max_selection: Number(max_selection) || 50,
      deadline_date: deadline_date || undefined,
      files,
    });

    return NextResponse.json({ gallery }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

