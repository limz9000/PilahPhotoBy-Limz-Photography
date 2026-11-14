export interface Studio {
  id: string;
  name: string;
  slug: string;
  whatsapp: string;
  created_at: string;
}

export interface Gallery {
  id: string;
  gallery_code: string;
  studio_id: string;
  title: string;
  client_name: string;
  drive_folder_url: string;
  drive_folder_id: string;
  max_selection: number;
  deadline_date?: string;
  status: 'draft' | 'active' | 'submitted';
  created_at: string;
  photo_count?: number;
  selected_count?: number;
}

export interface Photo {
  id: string;
  gallery_id: string;
  drive_file_id: string;
  file_name: string;
  thumbnail_url: string;
  width?: number;
  height?: number;
  is_selected?: boolean;
  notes?: string;
}

export interface Selection {
  id: string;
  gallery_id: string;
  photo_id: string;
  notes?: string;
  selected_at: string;
}

export interface DriveParsedFile {
  id: string;
  name: string;
  thumbnailUrl: string;
  width?: number;
  height?: number;
}

