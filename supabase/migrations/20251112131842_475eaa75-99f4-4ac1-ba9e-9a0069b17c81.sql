-- Create storage bucket for complaint attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('complaints', 'complaints', true);

-- Create storage policies for complaint attachments
CREATE POLICY "Students can upload their own attachments"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'complaints' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Everyone can view complaint attachments"
ON storage.objects
FOR SELECT
USING (bucket_id = 'complaints');

CREATE POLICY "Students can update their own attachments"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'complaints' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Students can delete their own attachments"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'complaints' AND
  auth.uid()::text = (storage.foldername(name))[1]
);