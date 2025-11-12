-- Update the handle_new_user trigger to auto-assign admin role to specific emails
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_role app_role;
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email
  );
  
  -- Determine role based on email
  IF new.email IN ('talk@brototype.com', 'admin@brototype.com') THEN
    user_role := 'admin';
  ELSE
    user_role := 'student';
  END IF;
  
  -- Assign role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, user_role);
  
  RETURN new;
END;
$$;

-- Update existing admin@brototype.com account to admin role if it exists
UPDATE public.user_roles 
SET role = 'admin' 
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email IN ('admin@brototype.com', 'talk@brototype.com')
);