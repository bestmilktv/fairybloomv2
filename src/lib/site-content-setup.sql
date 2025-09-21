-- Create site_content table for editable text content
CREATE TABLE IF NOT EXISTS public.site_content (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    content_id TEXT NOT NULL UNIQUE,
    content_text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on site_content table
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

-- RLS Policies for site_content table
DROP POLICY IF EXISTS "Anyone can view site content" ON public.site_content;
CREATE POLICY "Anyone can view site content" ON public.site_content
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Only admins can modify site content" ON public.site_content;
CREATE POLICY "Only admins can modify site content" ON public.site_content
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Trigger for site_content table
DROP TRIGGER IF EXISTS site_content_handle_updated_at ON public.site_content;
CREATE TRIGGER site_content_handle_updated_at
    BEFORE UPDATE ON public.site_content
    FOR EACH ROW
    EXECUTE PROCEDURE handle_updated_at();

-- Grant necessary permissions
GRANT ALL ON public.site_content TO authenticated;

-- Insert default content
INSERT INTO public.site_content (content_id, content_text) VALUES 
('hero-title', 'Přírodní krása zachycená v čase'),
('hero-subtitle', 'Objevte naši jedinečnou kolekci šperků s opravdovými květinami z českých luk a lesů. Každý kousek je vytvořen ručně s láskou k detailu a nese v sobě kouzlo přírody.'),
('náhrdelníky-title', 'Náhrdelníky'),
('náhrdelníky-subtitle', 'Elegantní náhrdelníky s květinami zachycenými v čase'),
('náušnice-title', 'Náušnice'),
('náušnice-subtitle', 'Jemné náušnice pro každodenní eleganci'),
('prsteny-title', 'Prsteny'),
('prsteny-subtitle', 'Jedinečné prsteny pro výjimečné okamžiky'),
('náramky-title', 'Náramky'),
('náramky-subtitle', 'Stylové náramky plné přírodní krásy'),
('values-title', 'Proč si vybrat Fairy Bloom'),
('values-subtitle', 'Každý kousek je vytvořen s láskou a pečlivostí pro ty, kteří oceňují autentickou krásu přírody'),
('newsletter-title', 'Objevte nové kolekce jako první'),
('newsletter-subtitle', 'Přihlaste se k odběru našeho newsletteru a získejte exkluzivní přístup k novinkám a speciálním nabídkám')
ON CONFLICT (content_id) DO NOTHING;

COMMENT ON TABLE public.site_content IS 'Editable site content for admin management';