-- ============================================================================
-- PILAHFOTO BY LIMZ PHOTOGRAPHY — SUPABASE DATABASE SCHEMA
-- ============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Drop existing tables if needed (Clean Setup)
DROP TABLE IF EXISTS selections CASCADE;
DROP TABLE IF EXISTS photos CASCADE;
DROP TABLE IF EXISTS galleries CASCADE;
DROP TABLE IF EXISTS studios CASCADE;

-- 3. Studios Table
CREATE TABLE studios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    whatsapp VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Galleries Table
CREATE TABLE galleries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gallery_code VARCHAR(30) UNIQUE NOT NULL,
    studio_id UUID REFERENCES studios(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    client_name VARCHAR(100) NOT NULL,
    drive_folder_url TEXT NOT NULL,
    drive_folder_id VARCHAR(100) NOT NULL,
    max_selection INTEGER DEFAULT 50,
    deadline_date DATE,
    pin_code VARCHAR(10),
    extra_photo_price INTEGER DEFAULT 0,
    allow_extra_selection BOOLEAN DEFAULT false,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('draft', 'active', 'submitted')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Photos Table (Metadata Cache from Google Drive)
CREATE TABLE photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gallery_id UUID REFERENCES galleries(id) ON DELETE CASCADE,
    drive_file_id VARCHAR(100) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    thumbnail_url TEXT NOT NULL,
    width INTEGER DEFAULT 1600,
    height INTEGER DEFAULT 1067,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Selections Table (Client Chosen Photos)
CREATE TABLE selections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gallery_id UUID REFERENCES galleries(id) ON DELETE CASCADE,
    photo_id UUID REFERENCES photos(id) ON DELETE CASCADE,
    notes TEXT,
    selected_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_gallery_photo UNIQUE(gallery_id, photo_id)
);

-- 7. Indexes for High Performance
CREATE INDEX idx_galleries_code ON galleries(gallery_code);
CREATE INDEX idx_galleries_status ON galleries(status);
CREATE INDEX idx_photos_gallery ON photos(gallery_id);
CREATE INDEX idx_selections_gallery ON selections(gallery_id);

-- 8. Auto Incremental Gallery Code Generator (GAL-YYYYMM-XXX)
CREATE OR REPLACE FUNCTION generate_gallery_code()
RETURNS TRIGGER AS $$
DECLARE
    current_period TEXT;
    last_seq INT;
    next_code TEXT;
BEGIN
    current_period := TO_CHAR(NOW(), 'YYYYMM');
    
    SELECT COALESCE(MAX(SUBSTRING(gallery_code FROM 12 FOR 3)::INT), 0)
    INTO last_seq
    FROM galleries
    WHERE gallery_code LIKE 'GAL-' || current_period || '-%';
    
    next_code := 'GAL-' || current_period || '-' || LPAD((last_seq + 1)::TEXT, 3, '0');
    
    NEW.gallery_code := next_code;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_gallery_code
BEFORE INSERT ON galleries
FOR EACH ROW
WHEN (NEW.gallery_code IS NULL OR NEW.gallery_code = '')
EXECUTE FUNCTION generate_gallery_code();

-- 9. Row Level Security (RLS)
ALTER TABLE studios ENABLE ROW LEVEL SECURITY;
ALTER TABLE galleries ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE selections ENABLE ROW LEVEL SECURITY;

-- Allow public read access to galleries and photos for clients
CREATE POLICY "Public can view active galleries"
ON galleries FOR SELECT
USING (true);

CREATE POLICY "Public can view photos"
ON photos FOR SELECT
USING (true);

-- Allow public to insert and manage selections for a gallery
CREATE POLICY "Public can insert selections"
ON selections FOR INSERT
WITH CHECK (true);

CREATE POLICY "Public can view selections"
ON selections FOR SELECT
USING (true);

CREATE POLICY "Public can delete selections"
ON selections FOR DELETE
USING (true);

-- Allow studio admin full access
CREATE POLICY "Studio full access galleries"
ON galleries FOR ALL
USING (true);

CREATE POLICY "Studio full access photos"
ON photos FOR ALL
USING (true);

CREATE POLICY "Studio full access studios"
ON studios FOR ALL
USING (true);

-- 10. Seed Initial Studio for Limz Photography
INSERT INTO studios (name, slug, whatsapp)
VALUES ('Limz Photography', 'limz-photography', '6281234567890')
ON CONFLICT (slug) DO NOTHING;

