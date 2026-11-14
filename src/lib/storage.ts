import fs from "fs";
import path from "path";
import { Gallery, Photo, Selection, Studio } from "./types";
import { supabase, isSupabaseConfigured } from "./supabase";

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_FILE = path.join(DATA_DIR, "database.json");

interface LocalDatabase {
  studio: Studio;
  galleries: Gallery[];
  photos: Photo[];
  selections: Selection[];
}

function getInitialDB(): LocalDatabase {
  return {
    studio: {
      id: "studio-limz-1",
      name: process.env.NEXT_PUBLIC_STUDIO_NAME || "Limz Photography",
      slug: "limz-photography",
      whatsapp: process.env.NEXT_PUBLIC_STUDIO_WHATSAPP || "6281352869000",
      created_at: new Date().toISOString(),
    },
    galleries: [],
    photos: [],
    selections: [],
  };
}

function readLocalDB(): LocalDatabase {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      const initial = getInitialDB();
      fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), "utf-8");
      return initial;
    }
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("Error reading local db, resetting:", err);
    return getInitialDB();
  }
}

function writeLocalDB(data: LocalDatabase): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing local db:", err);
  }
}

/**
 * Generate Incremental Gallery Code: GAL-YYYYMM-XXX
 */
export async function getNextGalleryCode(): Promise<string> {
  const currentPeriod = new Date().toISOString().slice(0, 7).replace("-", ""); // YYYYMM
  const prefix = `GAL-${currentPeriod}-`;

  if (isSupabaseConfigured && supabase) {
    const { data } = await supabase
      .from("galleries")
      .select("gallery_code")
      .like("gallery_code", `${prefix}%`)
      .order("gallery_code", { ascending: false })
      .limit(1);

    let nextNum = 1;
    if (data && data.length > 0) {
      const parts = data[0].gallery_code.split("-");
      const lastSeq = parseInt(parts[2], 10);
      if (!isNaN(lastSeq)) nextNum = lastSeq + 1;
    }
    return `${prefix}${String(nextNum).padStart(3, "0")}`;
  }

  // Local fallback
  const db = readLocalDB();
  const matching = db.galleries
    .filter((g) => g.gallery_code.startsWith(prefix))
    .map((g) => {
      const seq = parseInt(g.gallery_code.split("-")[2], 10);
      return isNaN(seq) ? 0 : seq;
    });

  const maxSeq = matching.length > 0 ? Math.max(...matching) : 0;
  return `${prefix}${String(maxSeq + 1).padStart(3, "0")}`;
}

export async function getStudioProfile(): Promise<Studio> {
  if (isSupabaseConfigured && supabase) {
    const { data } = await supabase.from("studios").select("*").limit(1).single();
    if (data) return data;
  }
  const db = readLocalDB();
  if (process.env.NEXT_PUBLIC_STUDIO_WHATSAPP) {
    db.studio.whatsapp = process.env.NEXT_PUBLIC_STUDIO_WHATSAPP;
  }
  return db.studio;
}

export async function listGalleries(): Promise<Gallery[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("galleries")
      .select(`
        *,
        photos (count),
        selections (count)
      `)
      .order("created_at", { ascending: false });

    if (!error && data) {
      return data.map((g: any) => ({
        ...g,
        photo_count: g.photos?.[0]?.count || 0,
        selected_count: g.selections?.[0]?.count || 0,
      }));
    }
  }

  const db = readLocalDB();
  return db.galleries.map((g) => {
    const photoCount = db.photos.filter((p) => p.gallery_id === g.id).length;
    const selectedCount = db.selections.filter((s) => s.gallery_id === g.id).length;
    return {
      ...g,
      photo_count: photoCount,
      selected_count: selectedCount,
    };
  });
}

export async function getGalleryByCode(code: string): Promise<{
  gallery: Gallery;
  photos: Photo[];
  selectedPhotoIds: string[];
} | null> {
  if (isSupabaseConfigured && supabase) {
    const { data: gallery } = await supabase
      .from("galleries")
      .select("*")
      .eq("gallery_code", code)
      .single();

    if (!gallery) return null;

    const { data: photos } = await supabase
      .from("photos")
      .select("*")
      .eq("gallery_id", gallery.id)
      .order("file_name", { ascending: true });

    const { data: selections } = await supabase
      .from("selections")
      .select("photo_id, notes")
      .eq("gallery_id", gallery.id);

    const selectedIds = (selections || []).map((s: any) => s.photo_id);
    const noteMap = new Map((selections || []).map((s: any) => [s.photo_id, s.notes || ""]));

    return {
      gallery,
      photos: (photos || []).map((p: any) => ({
        ...p,
        is_selected: selectedIds.includes(p.id),
        notes: noteMap.get(p.id) || "",
      })),
      selectedPhotoIds: selectedIds,
    };
  }

  const db = readLocalDB();
  const gallery = db.galleries.find((g) => g.gallery_code.toUpperCase() === code.toUpperCase());
  if (!gallery) return null;

  const photos = db.photos.filter((p) => p.gallery_id === gallery.id);
  const selections = db.selections.filter((s) => s.gallery_id === gallery.id);
  const selectedIds = selections.map((s) => s.photo_id);
  const noteMap = new Map(selections.map((s) => [s.photo_id, s.notes || ""]));

  return {
    gallery,
    photos: photos.map((p) => ({
      ...p,
      is_selected: selectedIds.includes(p.id),
      notes: noteMap.get(p.id) || "",
    })),
    selectedPhotoIds: selectedIds,
  };
}

export async function createGallery(payload: {
  title: string;
  client_name: string;
  drive_folder_url: string;
  drive_folder_id: string;
  max_selection: number;
  deadline_date?: string;
  pin_code?: string;
  extra_photo_price?: number;
  allow_extra_selection?: boolean;
  client_whatsapp?: string;
  event_date?: string;
  allow_download?: boolean;
  highlight_desc?: string;
  time_limit_days?: number;
  files: { id: string; name: string; thumbnailUrl: string; width?: number; height?: number }[];
}): Promise<Gallery> {
  const code = await getNextGalleryCode();
  const studio = await getStudioProfile();

  if (isSupabaseConfigured && supabase) {
    const { data: gallery, error } = await supabase
      .from("galleries")
      .insert({
        gallery_code: code,
        studio_id: studio.id,
        title: payload.title,
        client_name: payload.client_name,
        drive_folder_url: payload.drive_folder_url,
        drive_folder_id: payload.drive_folder_id,
        max_selection: payload.max_selection,
        deadline_date: payload.deadline_date || null,
        pin_code: payload.pin_code || null,
        extra_photo_price: payload.extra_photo_price || 0,
        allow_extra_selection: payload.allow_extra_selection || (payload.extra_photo_price ? payload.extra_photo_price > 0 : false),
        client_whatsapp: payload.client_whatsapp || null,
        event_date: payload.event_date || null,
        allow_download: payload.allow_download ?? true,
        highlight_desc: payload.highlight_desc || null,
        time_limit_days: payload.time_limit_days || 30,
        status: "active",
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    const photosToInsert = payload.files.map((f) => ({
      gallery_id: gallery.id,
      drive_file_id: f.id,
      file_name: f.name,
      thumbnail_url: f.thumbnailUrl,
      width: f.width || 1600,
      height: f.height || 1067,
    }));

    await supabase.from("photos").insert(photosToInsert);
    return gallery;
  }

  const db = readLocalDB();
  const galleryId = `gal-${Date.now()}`;
  const newGallery: Gallery = {
    id: galleryId,
    gallery_code: code,
    studio_id: studio.id,
    title: payload.title,
    client_name: payload.client_name,
    drive_folder_url: payload.drive_folder_url,
    drive_folder_id: payload.drive_folder_id,
    max_selection: payload.max_selection,
    deadline_date: payload.deadline_date,
    pin_code: payload.pin_code,
    extra_photo_price: payload.extra_photo_price || 0,
    allow_extra_selection: payload.allow_extra_selection || (payload.extra_photo_price ? payload.extra_photo_price > 0 : false),
    client_whatsapp: payload.client_whatsapp,
    event_date: payload.event_date,
    allow_download: payload.allow_download ?? true,
    highlight_desc: payload.highlight_desc,
    time_limit_days: payload.time_limit_days,
    status: "active",
    created_at: new Date().toISOString(),
  };

  const newPhotos: Photo[] = payload.files.map((f, idx) => ({
    id: `photo-${Date.now()}-${idx}`,
    gallery_id: galleryId,
    drive_file_id: f.id,
    file_name: f.name,
    thumbnail_url: f.thumbnailUrl,
    width: f.width || 1600,
    height: f.height || 1067,
  }));

  db.galleries.unshift(newGallery);
  db.photos.push(...newPhotos);
  writeLocalDB(db);

  return newGallery;
}

export async function deleteGallery(galleryId: string): Promise<boolean> {
  if (isSupabaseConfigured && supabase) {
    await supabase.from("galleries").delete().eq("id", galleryId);
    return true;
  }
  const db = readLocalDB();
  db.galleries = db.galleries.filter((g) => g.id !== galleryId);
  db.photos = db.photos.filter((p) => p.gallery_id !== galleryId);
  db.selections = db.selections.filter((s) => s.gallery_id !== galleryId);
  writeLocalDB(db);
  return true;
}

export async function unlockGallery(galleryId: string): Promise<boolean> {
  if (isSupabaseConfigured && supabase) {
    await supabase.from("galleries").update({ status: "active" }).eq("id", galleryId);
    return true;
  }
  const db = readLocalDB();
  const g = db.galleries.find((item) => item.id === galleryId);
  if (g) {
    g.status = "active";
    writeLocalDB(db);
  }
  return true;
}

export async function togglePhotoSelection(
  galleryId: string,
  photoId: string
): Promise<{ selected: boolean; totalSelected: number; maxSelection: number }> {
  if (isSupabaseConfigured && supabase) {
    const { data: gallery } = await supabase
      .from("galleries")
      .select("status, max_selection, extra_photo_price, allow_extra_selection")
      .eq("id", galleryId)
      .single();

    if (!gallery || gallery.status === "submitted") {
      throw new Error("Galeri ini sudah dikunci dan tidak dapat diubah.");
    }

    const { data: existing } = await supabase
      .from("selections")
      .select("id")
      .eq("gallery_id", galleryId)
      .eq("photo_id", photoId)
      .maybeSingle();

    if (existing) {
      await supabase.from("selections").delete().eq("id", existing.id);
      const { count } = await supabase
        .from("selections")
        .select("*", { count: "exact", head: true })
        .eq("gallery_id", galleryId);
      return { selected: false, totalSelected: count || 0, maxSelection: gallery.max_selection };
    }

    // Check quota
    const { count } = await supabase
      .from("selections")
      .select("*", { count: "exact", head: true })
      .eq("gallery_id", galleryId);

    const allowExtra = gallery.allow_extra_selection || (gallery.extra_photo_price && gallery.extra_photo_price > 0);
    if (!allowExtra && (count || 0) >= gallery.max_selection) {
      throw new Error(`Batas maksimal pilihan (${gallery.max_selection} foto) sudah tercapai.`);
    }

    await supabase.from("selections").insert({
      gallery_id: galleryId,
      photo_id: photoId,
    });

    return { selected: true, totalSelected: (count || 0) + 1, maxSelection: gallery.max_selection };
  }

  const db = readLocalDB();
  const gallery = db.galleries.find((g) => g.id === galleryId);
  if (!gallery || gallery.status === "submitted") {
    throw new Error("Galeri ini sudah dikunci dan tidak dapat diubah.");
  }

  const existingIdx = db.selections.findIndex(
    (s) => s.gallery_id === galleryId && s.photo_id === photoId
  );

  const currentCount = db.selections.filter((s) => s.gallery_id === galleryId).length;

  if (existingIdx >= 0) {
    db.selections.splice(existingIdx, 1);
    writeLocalDB(db);
    return { selected: false, totalSelected: currentCount - 1, maxSelection: gallery.max_selection };
  }

  const allowExtra = gallery.allow_extra_selection || (gallery.extra_photo_price && gallery.extra_photo_price > 0);
  if (!allowExtra && currentCount >= gallery.max_selection) {
    throw new Error(`Batas maksimal pilihan (${gallery.max_selection} foto) sudah tercapai.`);
  }

  db.selections.push({
    id: `sel-${Date.now()}`,
    gallery_id: galleryId,
    photo_id: photoId,
    selected_at: new Date().toISOString(),
  });
  writeLocalDB(db);

  return { selected: true, totalSelected: currentCount + 1, maxSelection: gallery.max_selection };
}

export async function updatePhotoNote(
  galleryId: string,
  photoId: string,
  notes: string
): Promise<{ success: boolean; notes: string }> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from("selections")
      .update({ notes })
      .eq("gallery_id", galleryId)
      .eq("photo_id", photoId);

    if (error) throw new Error(error.message);
    return { success: true, notes };
  }

  const db = readLocalDB();
  const selection = db.selections.find(
    (s) => s.gallery_id === galleryId && s.photo_id === photoId
  );
  if (selection) {
    selection.notes = notes;
    writeLocalDB(db);
  }
  return { success: true, notes };
}

export async function submitGallerySelections(galleryId: string): Promise<{ success: boolean }> {
  if (isSupabaseConfigured && supabase) {
    await supabase.from("galleries").update({ status: "submitted" }).eq("id", galleryId);
    return { success: true };
  }

  const db = readLocalDB();
  const g = db.galleries.find((item) => item.id === galleryId);
  if (g) {
    g.status = "submitted";
    writeLocalDB(db);
  }
  return { success: true };
}
