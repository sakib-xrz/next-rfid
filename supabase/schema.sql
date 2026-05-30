create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'course_type') then
    create type public.course_type as enum ('DIPLOMA', 'BACHELOR', 'M_SC', 'PHD');
  end if;

  if not exists (select 1 from pg_type where typname = 'role_type') then
    create type public.role_type as enum ('STUDENT', 'LECTURER', 'STAFF', 'VISITOR', 'ADMIN');
  elsif not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'role_type'
      and e.enumlabel = 'VISITOR'
  ) then
    alter type public.role_type add value 'VISITOR';
  end if;

  if not exists (select 1 from pg_type where typname = 'status_type') then
    create type public.status_type as enum ('PENDING', 'ACTIVE', 'INACTIVE', 'REJECTED');
  end if;

  if not exists (select 1 from pg_type where typname = 'action_type') then
    create type public.action_type as enum ('IN', 'OUT');
  end if;
end $$;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  id_from_institution text not null unique,
  name text not null,
  email text not null unique,
  phone text not null,
  car_number text not null,
  course public.course_type,
  role public.role_type not null default 'STUDENT',
  license_front_url text not null,
  license_back_url text not null,
  rfid_number varchar(24) unique,
  status public.status_type not null default 'PENDING',
  created_at timestamptz not null default now(),
  constraint users_student_course_required check (
    role <> 'STUDENT' or course is not null
  )
);

alter table if exists public.users
add column if not exists id_from_institution text;

update public.users
set id_from_institution = id::text
where id_from_institution is null;

alter table if exists public.users
alter column id_from_institution set not null;

create unique index if not exists users_id_from_institution_key
on public.users(id_from_institution);

create table if not exists public.logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  action public.action_type not null,
  created_at timestamptz not null default now()
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  in_time timestamptz not null,
  out_time timestamptz,
  total_time integer check (total_time is null or total_time >= 0)
);

create index if not exists users_status_idx on public.users(status);
create index if not exists users_rfid_number_idx on public.users(rfid_number);
create index if not exists users_id_from_institution_idx on public.users(id_from_institution);
create index if not exists logs_user_id_idx on public.logs(user_id);
create index if not exists logs_created_at_idx on public.logs(created_at desc);
create index if not exists sessions_user_id_idx on public.sessions(user_id);
create index if not exists sessions_out_time_idx on public.sessions(out_time);

create or replace function public.prevent_logs_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'logs table is append-only';
end;
$$;

drop trigger if exists trg_prevent_logs_update on public.logs;
create trigger trg_prevent_logs_update
before update or delete on public.logs
for each row
execute function public.prevent_logs_mutation();

create or replace function public.scan_rfid(p_rfid_number text, p_action public.action_type)
returns table (user_id uuid, user_name text, action public.action_type)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user public.users%rowtype;
  v_active_session public.sessions%rowtype;
  v_now timestamptz := now();
begin
  if p_rfid_number is null or char_length(trim(p_rfid_number)) = 0 then
    raise exception 'RFID is required';
  end if;

  if char_length(trim(p_rfid_number)) > 24 then
    raise exception 'RFID cannot exceed 24 characters';
  end if;

  select *
  into v_user
  from public.users u
  where u.rfid_number = trim(p_rfid_number)
    and u.status = 'ACTIVE'
  limit 1;

  if not found then
    raise exception 'No active user found for this RFID';
  end if;

  perform pg_advisory_xact_lock(hashtext(v_user.id::text));

  if p_action = 'IN' then
    select *
    into v_active_session
    from public.sessions s
    where s.user_id = v_user.id
      and s.out_time is null
    limit 1
    for update;

    if found then
      raise exception 'Vehicle is already inside';
    end if;

    insert into public.sessions(user_id, in_time)
    values (v_user.id, v_now);

    insert into public.logs(user_id, action, created_at)
    values (v_user.id, 'IN', v_now);
  else
    select *
    into v_active_session
    from public.sessions s
    where s.user_id = v_user.id
      and s.out_time is null
    limit 1
    for update;

    if not found then
      raise exception 'No active IN session found';
    end if;

    update public.sessions
    set
      out_time = v_now,
      total_time = greatest(0, extract(epoch from (v_now - in_time))::integer)
    where id = v_active_session.id;

    insert into public.logs(user_id, action, created_at)
    values (v_user.id, 'OUT', v_now);
  end if;

  return query
  select v_user.id, v_user.name, p_action;
end;
$$;

create or replace function public.force_close_session(p_session_id uuid)
returns table (session_id uuid, closed_at timestamptz, total_time integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.sessions%rowtype;
  v_now timestamptz := now();
  v_total integer;
begin
  select *
  into v_session
  from public.sessions
  where id = p_session_id
    and out_time is null
  limit 1
  for update;

  if not found then
    raise exception 'Session is already closed or does not exist';
  end if;

  v_total := greatest(0, extract(epoch from (v_now - v_session.in_time))::integer);

  update public.sessions
  set out_time = v_now, total_time = v_total
  where id = v_session.id;

  return query
  select v_session.id, v_now, v_total;
end;
$$;

create or replace function public.create_admin(
  p_email text,
  p_name text,
  p_phone text default 'N/A',
  p_car_number text default 'ADMIN-CAR',
  p_license_front_url text default 'admin/front-placeholder',
  p_license_back_url text default 'admin/back-placeholder'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(p_email));
  v_name text := trim(p_name);
  v_user_id uuid;
begin
  if v_email is null or v_email = '' then
    raise exception 'Email is required';
  end if;

  if v_name is null or v_name = '' then
    raise exception 'Name is required';
  end if;

  insert into public.users (
    name,
    email,
    phone,
    car_number,
    role,
    status,
    course,
    license_front_url,
    license_back_url
  )
  values (
    v_name,
    v_email,
    coalesce(nullif(trim(p_phone), ''), 'N/A'),
    coalesce(nullif(trim(p_car_number), ''), 'ADMIN-CAR'),
    'ADMIN',
    'ACTIVE',
    null,
    coalesce(nullif(trim(p_license_front_url), ''), 'admin/front-placeholder'),
    coalesce(nullif(trim(p_license_back_url), ''), 'admin/back-placeholder')
  )
  on conflict (email)
  do update set
    name = excluded.name,
    phone = excluded.phone,
    car_number = excluded.car_number,
    role = 'ADMIN',
    status = 'ACTIVE',
    course = null,
    license_front_url = excluded.license_front_url,
    license_back_url = excluded.license_back_url
  returning id into v_user_id;

  return v_user_id;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'logs'
  ) then
    alter publication supabase_realtime add table public.logs;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'sessions'
  ) then
    alter publication supabase_realtime add table public.sessions;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'users'
  ) then
    alter publication supabase_realtime add table public.users;
  end if;
end $$;

insert into storage.buckets (id, name, public)
values ('licenses', 'licenses', false)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Allow anon license upload" on storage.objects;
create policy "Allow anon license upload"
on storage.objects
for insert
to anon, authenticated
with check (bucket_id = 'licenses');
