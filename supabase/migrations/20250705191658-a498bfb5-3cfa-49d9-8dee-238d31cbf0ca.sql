-- Create user role enum
CREATE TYPE public.user_role AS ENUM ('learner', 'tutor', 'admin');

-- Create tutor status enum  
CREATE TYPE public.tutor_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');

-- Create session status enum
CREATE TYPE public.session_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');

-- Create payment status enum
CREATE TYPE public.payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'learner',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Create subjects table
CREATE TABLE public.subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tutors table
CREATE TABLE public.tutors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  status tutor_status NOT NULL DEFAULT 'pending',
  hourly_rate DECIMAL(10,2),
  experience_years INTEGER,
  education TEXT,
  certifications TEXT[],
  languages TEXT[],
  availability JSONB,
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tutor_subjects table (many-to-many relationship)
CREATE TABLE public.tutor_subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tutor_id UUID NOT NULL REFERENCES public.tutors(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  proficiency_level TEXT CHECK (proficiency_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tutor_id, subject_id)
);

-- Create tutoring_sessions table
CREATE TABLE public.tutoring_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tutor_id UUID NOT NULL REFERENCES public.tutors(id) ON DELETE CASCADE,
  learner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id),
  title TEXT NOT NULL,
  description TEXT,
  scheduled_start TIMESTAMP WITH TIME ZONE NOT NULL,
  scheduled_end TIMESTAMP WITH TIME ZONE NOT NULL,
  actual_start TIMESTAMP WITH TIME ZONE,
  actual_end TIMESTAMP WITH TIME ZONE,
  status session_status NOT NULL DEFAULT 'scheduled',
  session_notes TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create messages table for real-time chat
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.tutoring_sessions(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'image')),
  file_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payments table
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.tutoring_sessions(id) ON DELETE CASCADE,
  payer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status payment_status NOT NULL DEFAULT 'pending',
  stripe_payment_intent_id TEXT,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create file_uploads table
CREATE TABLE public.file_uploads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  upload_purpose TEXT CHECK (upload_purpose IN ('profile_avatar', 'identity_verification', 'education_certificate', 'session_material')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutor_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutoring_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_uploads ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role user_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Tutors and admins can view learner profiles" ON public.profiles
  FOR SELECT USING (
    public.has_role(auth.uid(), 'tutor') OR 
    public.has_role(auth.uid(), 'admin')
  );

-- User roles policies
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert learner role for themselves" ON public.user_roles
  FOR INSERT WITH CHECK (auth.uid() = user_id AND role = 'learner');

-- Subjects policies (public read, admin write)
CREATE POLICY "Anyone can view subjects" ON public.subjects
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage subjects" ON public.subjects
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Tutors policies
CREATE POLICY "Tutors can view and update their own profile" ON public.tutors
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Learners can view approved tutors" ON public.tutors
  FOR SELECT USING (status = 'approved');

CREATE POLICY "Admins can manage all tutors" ON public.tutors
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Tutor subjects policies
CREATE POLICY "Tutors can manage their own subjects" ON public.tutor_subjects
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.tutors t 
      WHERE t.id = tutor_id AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view tutor subjects" ON public.tutor_subjects
  FOR SELECT USING (true);

-- Tutoring sessions policies
CREATE POLICY "Participants can view their sessions" ON public.tutoring_sessions
  FOR SELECT USING (
    learner_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.tutors t 
      WHERE t.id = tutor_id AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "Learners can create sessions" ON public.tutoring_sessions
  FOR INSERT WITH CHECK (auth.uid() = learner_id);

CREATE POLICY "Participants can update their sessions" ON public.tutoring_sessions
  FOR UPDATE USING (
    learner_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.tutors t 
      WHERE t.id = tutor_id AND t.user_id = auth.uid()
    )
  );

-- Messages policies
CREATE POLICY "Session participants can view messages" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tutoring_sessions s
      WHERE s.id = session_id AND (
        s.learner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.tutors t 
          WHERE t.id = s.tutor_id AND t.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Session participants can send messages" ON public.messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.tutoring_sessions s
      WHERE s.id = session_id AND (
        s.learner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.tutors t 
          WHERE t.id = s.tutor_id AND t.user_id = auth.uid()
        )
      )
    )
  );

-- Payments policies
CREATE POLICY "Users can view their own payments" ON public.payments
  FOR SELECT USING (payer_id = auth.uid() OR payee_id = auth.uid());

CREATE POLICY "System can create payments" ON public.payments
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can manage payments" ON public.payments
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- File uploads policies
CREATE POLICY "Users can manage their own files" ON public.file_uploads
  FOR ALL USING (auth.uid() = user_id);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name'
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'learner');
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at columns
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tutors_updated_at
  BEFORE UPDATE ON public.tutors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at
  BEFORE UPDATE ON public.tutoring_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some sample subjects
INSERT INTO public.subjects (name, description, category) VALUES
('Mathematics', 'Elementary to advanced mathematics including algebra, calculus, geometry', 'STEM'),
('Physics', 'Classical and modern physics concepts', 'STEM'),
('Chemistry', 'General, organic, and analytical chemistry', 'STEM'),
('Biology', 'Life sciences from cellular to ecological levels', 'STEM'),
('English Literature', 'Classic and contemporary literature analysis', 'Language Arts'),
('Spanish', 'Spanish language learning from beginner to advanced', 'Languages'),
('French', 'French language learning from beginner to advanced', 'Languages'),
('History', 'World history, American history, and historical analysis', 'Social Studies'),
('Computer Science', 'Programming, algorithms, and software development', 'STEM'),
('Music Theory', 'Musical composition, harmony, and analysis', 'Arts');

-- Enable realtime for messages table
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;