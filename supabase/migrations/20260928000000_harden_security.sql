alter table public.workspace_invitations
  add column if not exists expires_at timestamptz not null default (now() + interval '14 days');

create table if not exists public.signup_allowances (
  email text primary key check (email = lower(email)),
  expires_at timestamptz not null
);

alter table public.signup_allowances enable row level security;

alter table public.workspaces
  drop constraint if exists workspaces_name_length_check,
  add constraint workspaces_name_length_check
    check (char_length(name) <= 200);

alter table public.folders
  drop constraint if exists folders_name_length_check,
  add constraint folders_name_length_check
    check (char_length(name) <= 200);

alter table public.threads
  drop constraint if exists threads_name_length_check,
  add constraint threads_name_length_check
    check (char_length(name) <= 200);

alter table public.workspace_roles
  drop constraint if exists workspace_roles_name_length_check,
  add constraint workspace_roles_name_length_check
    check (char_length(name) <= 200),
  drop constraint if exists workspace_roles_icon_length_check,
  add constraint workspace_roles_icon_length_check
    check (char_length(icon) <= 64);

alter table public.workspace_invitations
  drop constraint if exists workspace_invitations_email_length_check,
  add constraint workspace_invitations_email_length_check
    check (char_length(email) <= 320);

alter table public.canvas_nodes
  drop constraint if exists canvas_nodes_position_finite_check,
  add constraint canvas_nodes_position_finite_check
    check (
      position_x > '-Infinity'::float8 and position_x < 'Infinity'::float8
      and position_y > '-Infinity'::float8 and position_y < 'Infinity'::float8
    ),
  drop constraint if exists canvas_nodes_label_length_check,
  add constraint canvas_nodes_label_length_check
    check (char_length(label) <= 5000);

alter table public.node_comments
  drop constraint if exists node_comments_text_length_check,
  add constraint node_comments_text_length_check
    check (char_length(text) <= 5000);

alter table public.canvas_comments
  drop constraint if exists canvas_comments_text_length_check,
  add constraint canvas_comments_text_length_check
    check (char_length(text) <= 5000);

alter table public.user_onboarding
  drop constraint if exists user_onboarding_completed_guides_length_check,
  add constraint user_onboarding_completed_guides_length_check
    check (cardinality(completed_guides) <= 32 and char_length(array_to_string(completed_guides, '')) <= 2048);

create unique index if not exists canvas_nodes_one_question_idx on public.canvas_nodes(thread_id) where type = 'question-node';

create index if not exists workspaces_owner_id_idx on public.workspaces(owner_id);

create index if not exists workspace_members_user_id_idx on public.workspace_members(user_id);
create index if not exists workspace_members_role_id_idx on public.workspace_members(role_id);

create index if not exists folders_workspace_id_idx on public.folders(workspace_id);
create index if not exists folders_parent_folder_id_idx on public.folders(parent_folder_id);

create index if not exists threads_workspace_id_idx on public.threads(workspace_id);
create index if not exists threads_folder_id_idx on public.threads(folder_id);

create index if not exists workspace_invitations_role_id_idx on public.workspace_invitations(role_id);

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.can_reference_canvas_node(source_id uuid, target_thread_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.canvas_nodes source_n
    join public.threads source_t on source_t.id = source_n.thread_id
    join public.threads target_t on target_t.id = target_thread_id
    where source_n.id = source_id
      and source_n.type = 'canvas-node'
      and source_t.workspace_id = target_t.workspace_id
      and public.is_workspace_member(target_t.workspace_id)
  );
$$;

create or replace function public.thread_has_question_node(p_thread_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.canvas_nodes q
    join public.threads t on t.id = q.thread_id
    where q.thread_id = p_thread_id and q.type = 'question-node' and public.is_workspace_member(t.workspace_id)
  );
$$;

create or replace function public.can_grant_role(p_role_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_roles r
    where r.id = p_role_id
      and public.can_grant_permissions(
        r.workspace_id, r.can_edit_canvas, r.can_comment, r.can_manage_structure,
        r.can_manage_members, r.can_manage_roles, r.can_manage_workspace
      )
  );
$$;

create or replace function public.guard_folder_parent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  creates_cycle boolean;
  parent_depth integer;
  subtree_height integer;
begin
  if tg_op = 'UPDATE'
    and new.parent_folder_id is not distinct from old.parent_folder_id
    and new.workspace_id = old.workspace_id then
    return new;
  end if;

  if new.parent_folder_id is null then
    return new;
  end if;

  if auth.uid() is not null and not public.has_workspace_permission(new.workspace_id, 'manage_structure') then
    return new;
  end if;

  if new.parent_folder_id = new.id then
    raise exception 'A folder cannot be moved into itself' using errcode = '22023';
  end if;

  perform 1 from public.folders
  where id = new.parent_folder_id and workspace_id = new.workspace_id
  for share;
  if not found then
    raise exception 'A folder can only be nested inside its own workspace' using errcode = '22023';
  end if;

  with recursive chain(id, parent_folder_id) as (
    select f.id, f.parent_folder_id from public.folders f where f.id = new.parent_folder_id
    union
    select f.id, f.parent_folder_id from public.folders f join chain c on f.id = c.parent_folder_id
  )
  select coalesce(bool_or(chain.id = new.id), false), count(*)::integer - 1
    into creates_cycle, parent_depth
  from chain;

  if creates_cycle then
    raise exception 'A folder cannot be moved into its own subfolder' using errcode = '22023';
  end if;

  with recursive below(id, level) as (
    select f.id, 1 from public.folders f where f.parent_folder_id = new.id
    union all
    select f.id, b.level + 1 from public.folders f join below b on f.parent_folder_id = b.id where b.level < 64
  )
  select coalesce(max(level), 0) into subtree_height from below;

  if parent_depth + 1 + subtree_height > 1 then
    raise exception 'Folders can only be nested one level deep' using errcode = '22023';
  end if;

  return new;
end;
$$;

create or replace function public.guard_thread_folder()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
    and new.folder_id is not distinct from old.folder_id
    and new.workspace_id = old.workspace_id then
    return new;
  end if;

  if new.folder_id is null then
    return new;
  end if;

  if auth.uid() is not null and not public.has_workspace_permission(new.workspace_id, 'manage_structure') then
    return new;
  end if;

  if not exists (
    select 1 from public.folders where id = new.folder_id and workspace_id = new.workspace_id
  ) then
    raise exception 'A thread can only be placed in a folder of its own workspace' using errcode = '22023';
  end if;

  return new;
end;
$$;

create or replace function public.grant_signup_allowance(p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_email text := lower(trim(coalesce(p_email, '')));
begin
  if normalized_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'A valid email is required' using errcode = '22023';
  end if;

  delete from public.signup_allowances where expires_at <= now();

  insert into public.signup_allowances (email, expires_at)
  values (normalized_email, now() + interval '15 minutes')
  on conflict (email) do update set expires_at = excluded.expires_at;
end;
$$;

create or replace function public.hook_before_user_created(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.signup_allowances
  where email = lower(trim(event -> 'user' ->> 'email')) and expires_at > now();
  if found then
    return '{}'::jsonb;
  end if;

  return jsonb_build_object(
    'error', jsonb_build_object('http_code', 403, 'message', 'Sign-up requires an invitation or an invite code')
  );
end;
$$;

create or replace function public.set_member_role(p_workspace_id uuid, p_user_id uuid, p_role_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_role public.workspace_roles;
  member_role public.workspace_roles;
begin
  if not public.has_workspace_permission(p_workspace_id, 'manage_members') then
    raise exception 'You cannot manage members in this workspace' using errcode = '42501';
  end if;

  select * into target_role from public.workspace_roles where id = p_role_id and workspace_id = p_workspace_id;
  if not found then
    raise exception 'Role not found in this workspace' using errcode = 'P0002';
  end if;

  if target_role.is_owner then
    raise exception 'Ownership can only be transferred' using errcode = '22023';
  end if;

  select r.* into member_role
  from public.workspace_members m
  join public.workspace_roles r on r.id = m.role_id
  where m.workspace_id = p_workspace_id and m.user_id = p_user_id;
  if not found then
    raise exception 'Member not found' using errcode = 'P0002';
  end if;

  if member_role.is_owner then
    raise exception 'The owner role can only be transferred' using errcode = '22023';
  end if;

  if not public.can_grant_role(p_role_id) then
    raise exception 'You cannot grant permissions you do not have' using errcode = '42501';
  end if;

  if not public.can_grant_role(member_role.id) then
    raise exception 'You cannot manage a member with permissions you do not have' using errcode = '42501';
  end if;

  update public.workspace_members set role_id = p_role_id
   where workspace_id = p_workspace_id and user_id = p_user_id and role_id = member_role.id;

  if not found then
    raise exception 'Member not found' using errcode = 'P0002';
  end if;
end;
$$;

create or replace function public.remove_workspace_member(p_workspace_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  member_role public.workspace_roles;
begin
  if not public.has_workspace_permission(p_workspace_id, 'manage_members') then
    raise exception 'You cannot manage members in this workspace' using errcode = '42501';
  end if;

  select r.* into member_role
  from public.workspace_members m
  join public.workspace_roles r on r.id = m.role_id
  where m.workspace_id = p_workspace_id and m.user_id = p_user_id;
  if not found then
    return;
  end if;

  if member_role.is_owner then
    raise exception 'The owner cannot be removed' using errcode = '22023';
  end if;

  if not public.can_grant_role(member_role.id) then
    raise exception 'You cannot manage a member with permissions you do not have' using errcode = '42501';
  end if;

  delete from public.workspace_members
   where workspace_id = p_workspace_id and user_id = p_user_id and role_id = member_role.id;
end;
$$;

create or replace function public.transfer_workspace_ownership(p_workspace_id uuid, p_new_owner_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_role_id uuid;
  member_role_id uuid;
begin
  select id into owner_role_id from public.workspace_roles where workspace_id = p_workspace_id and is_owner;
  select id into member_role_id from public.workspace_roles where workspace_id = p_workspace_id and key = 'member';

  if not exists (
    select 1 from public.workspace_members
    where workspace_id = p_workspace_id and user_id = auth.uid() and role_id = owner_role_id
  ) then
    raise exception 'Only the owner can transfer ownership' using errcode = '42501';
  end if;

  if p_new_owner_id = auth.uid() then
    raise exception 'Already the owner' using errcode = '22023';
  end if;

  update public.workspace_members set role_id = member_role_id
   where workspace_id = p_workspace_id and user_id = auth.uid() and role_id = owner_role_id;

  if not found then
    raise exception 'Only the owner can transfer ownership' using errcode = '42501';
  end if;

  update public.workspace_members set role_id = owner_role_id
   where workspace_id = p_workspace_id and user_id = p_new_owner_id;

  if not found then
    raise exception 'New owner must be a member' using errcode = 'P0002';
  end if;

  update public.workspaces set owner_id = p_new_owner_id where id = p_workspace_id;
end;
$$;

create or replace function public.update_workspace_role(
  p_role_id uuid,
  p_name text,
  p_icon text,
  p_can_edit_canvas boolean,
  p_can_comment boolean,
  p_can_manage_structure boolean,
  p_can_manage_members boolean,
  p_can_manage_roles boolean,
  p_can_manage_workspace boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.workspace_roles;
begin
  select * into target from public.workspace_roles
  where id = p_role_id and public.is_workspace_member(workspace_id);
  if not found then
    raise exception 'Role not found' using errcode = 'P0002';
  end if;

  if not public.has_workspace_permission(target.workspace_id, 'manage_roles') then
    raise exception 'You cannot manage roles in this workspace' using errcode = '42501';
  end if;

  if target.is_system then
    raise exception 'Built-in roles cannot be edited' using errcode = '22023';
  end if;

  if length(trim(coalesce(p_name, ''))) = 0 then
    raise exception 'Role name is required' using errcode = '22023';
  end if;

  if length(trim(p_name)) > 60 then
    raise exception 'Role name is too long' using errcode = '22023';
  end if;

  if not public.can_grant_role(p_role_id) then
    raise exception 'You cannot manage a role with permissions you do not have' using errcode = '42501';
  end if;

  if not public.can_grant_permissions(
    target.workspace_id, p_can_edit_canvas, p_can_comment, p_can_manage_structure,
    p_can_manage_members, p_can_manage_roles, p_can_manage_workspace
  ) then
    raise exception 'You cannot grant permissions you do not have' using errcode = '42501';
  end if;

  if exists (
    select 1 from public.workspace_roles
    where workspace_id = target.workspace_id and name = trim(p_name) and id <> p_role_id
  ) then
    raise exception 'A role with this name already exists' using errcode = '23505';
  end if;

  update public.workspace_roles
     set name = trim(p_name),
         icon = p_icon,
         can_edit_canvas = p_can_edit_canvas,
         can_comment = p_can_comment,
         can_manage_structure = p_can_manage_structure,
         can_manage_members = p_can_manage_members,
         can_manage_roles = p_can_manage_roles,
         can_manage_workspace = p_can_manage_workspace
   where id = p_role_id;
end;
$$;

create or replace function public.delete_workspace_role(p_role_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.workspace_roles;
  fallback_role_id uuid;
begin
  select * into target from public.workspace_roles
  where id = p_role_id and public.is_workspace_member(workspace_id);
  if not found then
    raise exception 'Role not found' using errcode = 'P0002';
  end if;

  if not public.has_workspace_permission(target.workspace_id, 'manage_roles') then
    raise exception 'You cannot manage roles in this workspace' using errcode = '42501';
  end if;

  if target.is_system then
    raise exception 'Built-in roles cannot be deleted' using errcode = '22023';
  end if;

  if not public.can_grant_role(p_role_id) then
    raise exception 'You cannot manage a role with permissions you do not have' using errcode = '42501';
  end if;

  select id into fallback_role_id
  from public.workspace_roles
  where workspace_id = target.workspace_id and key = 'member';

  if (
    exists (select 1 from public.workspace_members where role_id = p_role_id)
    or exists (
      select 1 from public.workspace_invitations
      where role_id = p_role_id and status = 'pending' and expires_at > now()
    )
  ) and not public.can_grant_role(fallback_role_id) then
    raise exception 'You cannot move people into a role with permissions you do not have' using errcode = '42501';
  end if;

  update public.workspace_members set role_id = fallback_role_id where role_id = p_role_id;
  update public.workspace_invitations set role_id = fallback_role_id
   where role_id = p_role_id and status = 'pending' and expires_at > now();

  delete from public.workspace_roles where id = p_role_id;
end;
$$;

create or replace function public.create_workspace_invitation(p_workspace_id uuid, p_email text, p_role_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_email text := lower(trim(p_email));
  target_role public.workspace_roles;
  pending_role_id uuid;
  invite_id uuid;
begin
  if not public.has_workspace_permission(p_workspace_id, 'manage_members') then
    raise exception 'You cannot manage members in this workspace' using errcode = '42501';
  end if;

  if normalized_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'A valid email is required' using errcode = '22023';
  end if;

  select * into target_role from public.workspace_roles where id = p_role_id and workspace_id = p_workspace_id;
  if not found then
    raise exception 'Role not found in this workspace' using errcode = 'P0002';
  end if;

  if target_role.is_owner then
    raise exception 'Cannot invite someone as owner' using errcode = '22023';
  end if;

  if not public.can_grant_role(p_role_id) then
    raise exception 'You cannot grant permissions you do not have' using errcode = '42501';
  end if;

  if exists (
    select 1 from public.workspace_members m
    join auth.users u on u.id = m.user_id
    where m.workspace_id = p_workspace_id and lower(u.email) = normalized_email
  ) then
    raise exception 'This person is already a member' using errcode = '23505';
  end if;

  perform 1 from public.workspaces where id = p_workspace_id for no key update;

  select role_id into pending_role_id
  from public.workspace_invitations
  where workspace_id = p_workspace_id and email = normalized_email and status = 'pending' and expires_at > now();
  if found and not public.can_grant_role(pending_role_id) then
    raise exception 'You cannot manage an invitation with permissions you do not have' using errcode = '42501';
  end if;

  if not found and (
    select count(*) from public.workspace_invitations
    where workspace_id = p_workspace_id and status = 'pending' and expires_at > now()
  ) >= 100 then
    raise exception 'Too many pending invitations' using errcode = '54000';
  end if;

  insert into public.workspace_invitations (workspace_id, email, role_id, invited_by, status)
  values (p_workspace_id, normalized_email, p_role_id, auth.uid(), 'pending')
  on conflict (workspace_id, email)
  do update set role_id = excluded.role_id, invited_by = excluded.invited_by, status = 'pending',
    expires_at = excluded.expires_at, updated_at = now()
  returning id into invite_id;

  return invite_id;
end;
$$;

create or replace function public.revoke_workspace_invitation(p_invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.workspace_invitations;
begin
  select * into target from public.workspace_invitations where id = p_invitation_id;
  if not found then
    return;
  end if;

  if not public.has_workspace_permission(target.workspace_id, 'manage_members') then
    raise exception 'You cannot manage members in this workspace' using errcode = '42501';
  end if;

  if not public.can_grant_role(target.role_id) then
    raise exception 'You cannot manage an invitation with permissions you do not have' using errcode = '42501';
  end if;

  delete from public.workspace_invitations where id = p_invitation_id;
end;
$$;

create or replace function public.get_workspace_members(p_workspace_id uuid)
returns table (
  user_id uuid,
  role_id uuid,
  role_key text,
  role_name text,
  is_owner boolean,
  joined_at timestamptz,
  email text,
  name text,
  avatar_icon text
)
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'Not a member of this workspace' using errcode = '42501';
  end if;

  return query
    select
      m.user_id, r.id, r.key, r.name, r.is_owner, m.joined_at,
      u.email::text,
      left(u.raw_user_meta_data ->> 'name', 200),
      left(u.raw_user_meta_data ->> 'avatarIcon', 64)
    from public.workspace_members m
    join public.workspace_roles r on r.id = m.role_id
    join auth.users u on u.id = m.user_id
    where m.workspace_id = p_workspace_id
    order by r.is_owner desc, r.position, m.joined_at;
end;
$$;

create or replace function public.get_workspace_invitations(p_workspace_id uuid)
returns table (
  id uuid,
  email text,
  role_id uuid,
  role_key text,
  role_name text,
  created_at timestamptz
)
language plpgsql
security definer
stable
set search_path = public
as $$
#variable_conflict use_column
begin
  if not public.has_workspace_permission(p_workspace_id, 'manage_members') then
    raise exception 'You cannot manage members in this workspace' using errcode = '42501';
  end if;

  return query
    select i.id, i.email, i.role_id, r.key, r.name, i.created_at
    from public.workspace_invitations i
    join public.workspace_roles r on r.id = i.role_id
    where i.workspace_id = p_workspace_id and i.status = 'pending' and i.expires_at > now()
    order by i.created_at desc;
end;
$$;

create or replace function public.get_my_invitations()
returns table (
  id uuid,
  workspace_id uuid,
  workspace_name text,
  role_key text,
  role_name text,
  invited_by_name text,
  created_at timestamptz
)
language plpgsql
security definer
stable
set search_path = public
as $$
#variable_conflict use_column
begin
  return query
    select i.id, i.workspace_id, w.name, r.key, r.name,
      left(inviter.raw_user_meta_data ->> 'name', 200),
      i.created_at
    from public.workspace_invitations i
    join public.workspaces w on w.id = i.workspace_id
    join public.workspace_roles r on r.id = i.role_id
    left join auth.users inviter on inviter.id = i.invited_by
    where lower(i.email) = (select lower(u.email) from auth.users u where u.id = auth.uid())
      and i.status = 'pending' and i.expires_at > now()
    order by i.created_at desc;
end;
$$;

create or replace function public.accept_workspace_invitation(p_invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.workspace_invitations;
begin
  update public.workspace_invitations set status = 'accepted'
   where id = p_invitation_id and status = 'pending' and expires_at > now()
     and lower(email) = (select lower(u.email) from auth.users u where u.id = auth.uid())
  returning * into target;

  if not found then
    raise exception 'Invitation not found' using errcode = 'P0002';
  end if;

  insert into public.workspace_members (workspace_id, user_id, role_id, position)
  values (
    target.workspace_id, auth.uid(), target.role_id,
    (select coalesce(max(position), -1) + 1 from public.workspace_members where user_id = auth.uid())
  )
  on conflict (workspace_id, user_id) do nothing;
end;
$$;

create or replace function public.decline_workspace_invitation(p_invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.workspace_invitations set status = 'declined'
   where id = p_invitation_id and status = 'pending' and expires_at > now()
     and lower(email) = (select lower(u.email) from auth.users u where u.id = auth.uid());
end;
$$;

create or replace function public.get_my_owned_shared_workspaces()
returns table (
  id uuid,
  name text
)
language sql
security definer
stable
set search_path = public
as $$
  select w.id, w.name
  from public.workspaces w
  where w.owner_id = auth.uid()
    and exists (
      select 1 from public.workspace_members m
      where m.workspace_id = w.id and m.user_id <> auth.uid()
    )
  order by w.name;
$$;

drop trigger if exists on_folder_placed on public.folders;

create trigger on_folder_placed
  before insert or update of parent_folder_id, workspace_id on public.folders
  for each row
  execute function public.guard_folder_parent();

drop trigger if exists on_thread_placed on public.threads;

create trigger on_thread_placed
  before insert or update of folder_id, workspace_id on public.threads
  for each row
  execute function public.guard_thread_folder();

drop policy if exists "editors insert canvas nodes" on public.canvas_nodes;

create policy "editors insert canvas nodes"
  on public.canvas_nodes for insert
  with check (
    (
      public.has_workspace_permission(
        (select t.workspace_id from public.threads t where t.id = canvas_nodes.thread_id),
        'edit_canvas'
      )
      or (
        canvas_nodes.type = 'question-node'
        and public.has_workspace_permission(
          (select t.workspace_id from public.threads t where t.id = canvas_nodes.thread_id),
          'manage_structure'
        )
      )
    )
    and created_by = auth.uid()
    and (
      canvas_nodes.type <> 'question-node'
      or not public.thread_has_question_node(canvas_nodes.thread_id)
    )
    and (
      canvas_nodes.source_node_id is null
      or public.can_reference_canvas_node(canvas_nodes.source_node_id, canvas_nodes.thread_id)
    )
  );

drop policy if exists "editors insert canvas edges" on public.canvas_edges;

create policy "editors insert canvas edges"
  on public.canvas_edges for insert
  with check (
    public.has_workspace_permission(
      (select t.workspace_id from public.threads t where t.id = canvas_edges.thread_id),
      'edit_canvas'
    )
    and created_by = auth.uid()
    and exists (
      select 1 from public.canvas_nodes sn
      where sn.id = canvas_edges.source_node_id and sn.thread_id = canvas_edges.thread_id
    )
    and exists (
      select 1 from public.canvas_nodes tn
      where tn.id = canvas_edges.target_node_id and tn.thread_id = canvas_edges.thread_id
    )
  );

revoke insert, update, delete, truncate, references, trigger, maintain on all tables in schema public from anon;
revoke truncate, references, trigger, maintain on all tables in schema public from authenticated;

alter default privileges in schema public
  revoke insert, update, delete, truncate, references, trigger, maintain on tables from anon;
alter default privileges in schema public
  revoke truncate, references, trigger, maintain on tables from authenticated;
alter default privileges revoke execute on functions from public;

revoke insert, update, delete on public.workspace_roles from anon, authenticated;
revoke insert, update, delete on public.workspace_invitations from anon, authenticated;
revoke insert, delete on public.workspace_members from anon, authenticated;

revoke insert on public.workspaces from anon, authenticated;
grant insert (id, name, owner_id) on public.workspaces to authenticated;

revoke insert, update on public.folders from anon, authenticated;
grant insert (id, workspace_id, parent_folder_id, name, position) on public.folders to authenticated;
grant update (name, parent_folder_id, position) on public.folders to authenticated;

revoke insert, update on public.threads from anon, authenticated;
grant insert (id, workspace_id, folder_id, name, position) on public.threads to authenticated;
grant update (name, folder_id, position) on public.threads to authenticated;

revoke insert, update on public.canvas_nodes from anon, authenticated;
grant insert (id, thread_id, type, position_x, position_y, label, status, source_node_id, is_answer, created_by)
  on public.canvas_nodes to authenticated;
grant update (label, position_x, position_y, status, is_answer) on public.canvas_nodes to authenticated;

revoke insert, update on public.canvas_edges from anon, authenticated;
grant insert (id, thread_id, source_node_id, target_node_id, source_handle, target_handle, created_by)
  on public.canvas_edges to authenticated;

revoke insert, update on public.node_comments from anon, authenticated;
grant insert (id, node_id, author_id, text) on public.node_comments to authenticated;
grant update (text) on public.node_comments to authenticated;

revoke insert, update on public.canvas_comments from anon, authenticated;
grant insert (id, thread_id, author_id, text) on public.canvas_comments to authenticated;
grant update (text) on public.canvas_comments to authenticated;

revoke all on public.signup_allowances from anon, authenticated;

grant usage on schema public to supabase_auth_admin;

revoke execute on function public.grant_signup_allowance(text) from public, anon, authenticated;
grant execute on function public.grant_signup_allowance(text) to service_role;

revoke execute on function public.hook_before_user_created(jsonb) from public, anon, authenticated, service_role;
grant execute on function public.hook_before_user_created(jsonb) to supabase_auth_admin;

revoke execute on function public.get_my_owned_shared_workspaces() from public, anon, service_role;
grant execute on function public.get_my_owned_shared_workspaces() to authenticated;

revoke execute on function public.seed_workspace_roles(uuid) from public, anon, authenticated;
revoke execute on function public.canvas_node_workspace_id(uuid) from public, anon, authenticated;
revoke execute on function public.can_grant_permissions(uuid, boolean, boolean, boolean, boolean, boolean, boolean) from public, anon, authenticated;
revoke execute on function public.can_grant_role(uuid) from public, anon, authenticated;

revoke execute on function public.is_workspace_member(uuid) from public;
revoke execute on function public.has_workspace_permission(uuid, text) from public;
revoke execute on function public.is_workspace_owner(uuid) from public;
revoke execute on function public.thread_has_question_node(uuid) from public;
revoke execute on function public.can_reference_canvas_node(uuid, uuid) from public;
grant execute on function public.is_workspace_member(uuid) to anon, authenticated, service_role;
grant execute on function public.has_workspace_permission(uuid, text) to anon, authenticated, service_role;
grant execute on function public.is_workspace_owner(uuid) to anon, authenticated, service_role;
grant execute on function public.thread_has_question_node(uuid) to anon, authenticated, service_role;
grant execute on function public.can_reference_canvas_node(uuid, uuid) to anon, authenticated, service_role;

revoke execute on function public.accept_workspace_invitation(uuid) from public, anon;
revoke execute on function public.create_workspace_invitation(uuid, text, uuid) from public, anon;
revoke execute on function public.create_workspace_role(uuid, text, text, boolean, boolean, boolean, boolean, boolean, boolean) from public, anon;
revoke execute on function public.decline_workspace_invitation(uuid) from public, anon;
revoke execute on function public.delete_workspace_role(uuid) from public, anon;
revoke execute on function public.get_my_invitations() from public, anon;
revoke execute on function public.get_my_workspace_permissions(uuid) from public, anon;
revoke execute on function public.get_my_workspaces() from public, anon;
revoke execute on function public.get_workspace_invitations(uuid) from public, anon;
revoke execute on function public.get_workspace_members(uuid) from public, anon;
revoke execute on function public.get_workspace_roles(uuid) from public, anon;
revoke execute on function public.remove_workspace_member(uuid, uuid) from public, anon;
revoke execute on function public.revoke_workspace_invitation(uuid) from public, anon;
revoke execute on function public.set_canvas_node_answer(uuid, boolean) from public, anon;
revoke execute on function public.set_canvas_node_status(uuid, text) from public, anon;
revoke execute on function public.set_member_role(uuid, uuid, uuid) from public, anon;
revoke execute on function public.transfer_workspace_ownership(uuid, uuid) from public, anon;
revoke execute on function public.update_canvas_node_positions(jsonb) from public, anon;
revoke execute on function public.update_workspace_role(uuid, text, text, boolean, boolean, boolean, boolean, boolean, boolean) from public, anon;

grant execute on function public.accept_workspace_invitation(uuid) to authenticated, service_role;
grant execute on function public.create_workspace_invitation(uuid, text, uuid) to authenticated, service_role;
grant execute on function public.create_workspace_role(uuid, text, text, boolean, boolean, boolean, boolean, boolean, boolean) to authenticated, service_role;
grant execute on function public.decline_workspace_invitation(uuid) to authenticated, service_role;
grant execute on function public.delete_workspace_role(uuid) to authenticated, service_role;
grant execute on function public.get_my_invitations() to authenticated, service_role;
grant execute on function public.get_my_workspace_permissions(uuid) to authenticated, service_role;
grant execute on function public.get_my_workspaces() to authenticated, service_role;
grant execute on function public.get_workspace_invitations(uuid) to authenticated, service_role;
grant execute on function public.get_workspace_members(uuid) to authenticated, service_role;
grant execute on function public.get_workspace_roles(uuid) to authenticated, service_role;
grant execute on function public.remove_workspace_member(uuid, uuid) to authenticated, service_role;
grant execute on function public.revoke_workspace_invitation(uuid) to authenticated, service_role;
grant execute on function public.set_canvas_node_answer(uuid, boolean) to authenticated, service_role;
grant execute on function public.set_canvas_node_status(uuid, text) to authenticated, service_role;
grant execute on function public.set_member_role(uuid, uuid, uuid) to authenticated, service_role;
grant execute on function public.transfer_workspace_ownership(uuid, uuid) to authenticated, service_role;
grant execute on function public.update_canvas_node_positions(jsonb) to authenticated, service_role;
grant execute on function public.update_workspace_role(uuid, text, text, boolean, boolean, boolean, boolean, boolean, boolean) to authenticated, service_role;
