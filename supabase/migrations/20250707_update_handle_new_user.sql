-- Update function to handle new user signup with role selection
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  selected_role public.user_role;
BEGIN
  -- Determine role from metadata, default to learner if not specified or invalid
  BEGIN
    selected_role := (NEW.raw_user_meta_data ->> 'role')::public.user_role;
  EXCEPTION WHEN OTHERS THEN
    selected_role := 'learner';
  END;
  
  -- If role is null (e.g. not in enum), default to learner
  IF selected_role IS NULL THEN
    selected_role := 'learner';
  END IF;

  INSERT INTO public.profiles (user_id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name'
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, selected_role);
  
  RETURN NEW;
END;
$$;
