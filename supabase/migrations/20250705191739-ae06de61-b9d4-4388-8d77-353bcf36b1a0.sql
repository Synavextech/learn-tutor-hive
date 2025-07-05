-- Create storage buckets for file uploads
INSERT INTO storage.buckets (id, name, public) VALUES
  ('avatars', 'avatars', true),
  ('documents', 'documents', false),
  ('certificates', 'certificates', false),
  ('session-materials', 'session-materials', false);

-- Storage policies for avatars (public)
CREATE POLICY "Avatar images are publicly accessible" 
  ON storage.objects FOR SELECT 
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" 
  ON storage.objects FOR INSERT 
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar" 
  ON storage.objects FOR UPDATE 
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar" 
  ON storage.objects FOR DELETE 
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for documents (private)
CREATE POLICY "Users can view their own documents" 
  ON storage.objects FOR SELECT 
  USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own documents" 
  ON storage.objects FOR INSERT 
  WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all documents" 
  ON storage.objects FOR SELECT 
  USING (bucket_id = 'documents' AND public.has_role(auth.uid(), 'admin'));

-- Storage policies for certificates (private)
CREATE POLICY "Users can view their own certificates" 
  ON storage.objects FOR SELECT 
  USING (bucket_id = 'certificates' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own certificates" 
  ON storage.objects FOR INSERT 
  WITH CHECK (bucket_id = 'certificates' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all certificates" 
  ON storage.objects FOR SELECT 
  USING (bucket_id = 'certificates' AND public.has_role(auth.uid(), 'admin'));

-- Storage policies for session materials (private)
CREATE POLICY "Session participants can view materials" 
  ON storage.objects FOR SELECT 
  USING (
    bucket_id = 'session-materials' AND
    EXISTS (
      SELECT 1 FROM public.tutoring_sessions s
      WHERE (storage.foldername(name))[1] = s.id::text AND (
        s.learner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.tutors t 
          WHERE t.id = s.tutor_id AND t.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Session participants can upload materials" 
  ON storage.objects FOR INSERT 
  WITH CHECK (
    bucket_id = 'session-materials' AND
    EXISTS (
      SELECT 1 FROM public.tutoring_sessions s
      WHERE (storage.foldername(name))[1] = s.id::text AND (
        s.learner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.tutors t 
          WHERE t.id = s.tutor_id AND t.user_id = auth.uid()
        )
      )
    )
  );