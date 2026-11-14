import { NextResponse } from "next/server";
import { extractDriveFolderId, parseDriveFolder } from "@/lib/drive";

export async function POST(req: Request) {
  try {
    const { folderUrl } = await req.json();

    if (!folderUrl) {
      return NextResponse.json({ error: "Tautan Google Drive wajib diisi." }, { status: 400 });
    }

    const folderId = extractDriveFolderId(folderUrl);
    if (!folderId) {
      return NextResponse.json(
        { error: "Tautan tidak dikenali. Pastikan Anda menyalin link folder Google Drive publik." },
        { status: 400 }
      );
    }

    const result = await parseDriveFolder(folderUrl);

    return NextResponse.json({
      folderId,
      folderName: result.folderName,
      totalFiles: result.files.length,
      files: result.files,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Gagal memproses folder Google Drive." },
      { status: 400 }
    );
  }
}
