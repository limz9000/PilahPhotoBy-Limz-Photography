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
    const {
      title,
      client_name,
      drive_folder_url,
      drive_folder_id,
      max_selection,
      deadline_date,
      pin_code,
      extra_photo_price,
      client_whatsapp,
      event_date,
      allow_download,
      highlight_desc,
      time_limit_days,
      files,
    } = body;

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
      pin_code: pin_code ? String(pin_code).trim() : undefined,
      extra_photo_price: Number(extra_photo_price) || 0,
      client_whatsapp: client_whatsapp ? String(client_whatsapp).trim() : undefined,
      event_date: event_date || undefined,
      allow_download: typeof allow_download === "boolean" ? allow_download : true,
      highlight_desc: highlight_desc || undefined,
      time_limit_days: time_limit_days ? Number(time_limit_days) : undefined,
      files,
    });

    return NextResponse.json({ gallery }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

