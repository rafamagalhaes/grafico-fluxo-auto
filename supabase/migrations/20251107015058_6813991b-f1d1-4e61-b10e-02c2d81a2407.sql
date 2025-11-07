-- Criar bucket para logos das empresas
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-logos', 'company-logos', true);

-- Adicionar coluna logo_url na tabela companies
ALTER TABLE companies
ADD COLUMN logo_url TEXT;

-- Políticas RLS para o bucket de logos
CREATE POLICY "Logos são públicas"
ON storage.objects FOR SELECT
USING (bucket_id = 'company-logos');

CREATE POLICY "Usuários podem fazer upload da logo da sua empresa"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'company-logos' 
  AND auth.uid() IN (
    SELECT uc.user_id 
    FROM user_companies uc 
    WHERE uc.company_id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Usuários podem atualizar a logo da sua empresa"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'company-logos' 
  AND auth.uid() IN (
    SELECT uc.user_id 
    FROM user_companies uc 
    WHERE uc.company_id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Usuários podem deletar a logo da sua empresa"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'company-logos' 
  AND auth.uid() IN (
    SELECT uc.user_id 
    FROM user_companies uc 
    WHERE uc.company_id::text = (storage.foldername(name))[1]
  )
);