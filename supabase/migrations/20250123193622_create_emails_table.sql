create table if not exists public.emails (
    id uuid not null default uuid_generate_v4() primary key,
    ticket_id uuid not null references public.tickets(id),
    sent_by uuid not null references public.users(id),
    to_email text not null,
    cc text,
    bcc text,
    subject text not null,
    body text not null,
    status text not null default 'draft',
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now(),
    deleted_at timestamp with time zone
);

-- Add RLS policies
alter table public.emails enable row level security;

create policy "Emails are viewable by ticket organization members."
    on public.emails for select
    using (
        exists (
            select 1 from public.tickets t
            join public.organization_members om on om.organization_id = t.organization_id
            where t.id = emails.ticket_id
            and om.user_id = auth.uid()
        )
    );

create policy "Emails are insertable by ticket organization members."
    on public.emails for insert
    with check (
        exists (
            select 1 from public.tickets t
            join public.organization_members om on om.organization_id = t.organization_id
            where t.id = emails.ticket_id
            and om.user_id = auth.uid()
        )
    );

-- Add function to update updated_at timestamp
create trigger set_emails_updated_at
    before update on public.emails
    for each row
    execute function update_updated_at_column();
