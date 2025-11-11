-- Create app_role enum
create type public.app_role as enum ('admin', 'student');

-- Create profiles table
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  name text not null,
  email text unique not null,
  created_at timestamptz default now(),
  last_login timestamptz,
  status text default 'active' check (status in ('active', 'inactive'))
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

-- Create user_roles table (CRITICAL for security)
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  assigned_at timestamptz default now(),
  assigned_by uuid references auth.users(id),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

create policy "Users can view own roles"
  on public.user_roles for select
  to authenticated
  using (auth.uid() = user_id);

-- Security definer function to check role (prevents RLS recursion)
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;

-- Helper function to get user role
create or replace function public.get_user_role(_user_id uuid)
returns app_role
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.user_roles
  where user_id = _user_id
  limit 1
$$;

-- Create complaints table
create table public.complaints (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  category text not null check (category in ('Technical', 'Infrastructure', 'Behavior', 'Other')),
  description text not null,
  attachment_url text,
  status text default 'Open' check (status in ('Open', 'In Progress', 'Resolved')),
  priority text default 'Medium' check (priority in ('Low', 'Medium', 'High')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  resolved_by uuid references auth.users(id),
  admin_remarks text
);

alter table public.complaints enable row level security;

create policy "Students can view own complaints"
  on public.complaints for select
  to authenticated
  using (auth.uid() = student_id);

create policy "Students can create complaints"
  on public.complaints for insert
  to authenticated
  with check (auth.uid() = student_id);

create policy "Admins can view all complaints"
  on public.complaints for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can update complaints"
  on public.complaints for update
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- Create status_history table
create table public.status_history (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid references public.complaints(id) on delete cascade not null,
  updated_by uuid references auth.users(id) not null,
  old_status text not null,
  new_status text not null,
  remarks text,
  updated_at timestamptz default now()
);

alter table public.status_history enable row level security;

create policy "Users can view history of own complaints"
  on public.status_history for select
  to authenticated
  using (
    exists (
      select 1 from public.complaints
      where id = complaint_id
      and student_id = auth.uid()
    )
  );

create policy "Admins can view all history"
  on public.status_history for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can create history"
  on public.status_history for insert
  to authenticated
  with check (public.has_role(auth.uid(), 'admin'));

-- Auto-create profile and assign student role on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email
  );
  
  -- Auto-assign 'student' role by default
  insert into public.user_roles (user_id, role)
  values (new.id, 'student');
  
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();