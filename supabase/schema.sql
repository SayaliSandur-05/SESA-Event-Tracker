-- ====================================================================
-- SESA EVENT TRACKER: PRODUCTION DATABASE SCHEMA & RLS POLICIES
-- Department Of Software Engineering
-- MIT Academy of Engineering (MITAOE), Alandi (D.), Pune
-- ====================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE (Staff & Administrative Roles)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    username TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('super_admin', 'organizer', 'volunteer', 'student')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index on role for fast permission lookups
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- 2. VOLUNTEER ACCOUNTS TABLE (Dedicated Volunteer Accounts for Simultaneous Terminal Access)
CREATE TABLE IF NOT EXISTS public.volunteer_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    password_hash TEXT NOT NULL DEFAULT 'sesa2026',
    role TEXT NOT NULL DEFAULT 'volunteer' CHECK (role IN ('volunteer', 'lead', 'super_admin')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_volunteer_accounts_username ON public.volunteer_accounts(username);
CREATE INDEX IF NOT EXISTS idx_volunteer_accounts_role ON public.volunteer_accounts(role);

-- 3. MEMBERSHIPS TABLE (Central Student Eligibility & Verification)
CREATE TABLE IF NOT EXISTS public.memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prn TEXT UNIQUE NOT NULL, -- Normalized uppercase PRN (e.g., 'MIT2024001')
    full_name TEXT NOT NULL,
    email TEXT,
    contact TEXT,
    branch TEXT DEFAULT 'Department Of Software Engineering',
    academic_year TEXT DEFAULT 'Third Year (TY)',
    payment_status TEXT NOT NULL CHECK (payment_status IN ('paid', 'pending', 'unpaid')),
    fee_amount NUMERIC NOT NULL DEFAULT 1000, -- Verified ₹1,000 annual SESA membership fee
    payment_mode TEXT DEFAULT 'online', -- 'cash', 'upi', 'online', 'bank_transfer'
    verified_at TIMESTAMPTZ,
    verified_by TEXT, -- Profile / Volunteer ID / Staff name who verified payment
    verification_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_memberships_prn ON public.memberships(prn);
CREATE INDEX IF NOT EXISTS idx_memberships_payment_status ON public.memberships(payment_status);

-- 3. EVENTS TABLE
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    summary TEXT NOT NULL,
    description TEXT NOT NULL,
    venue TEXT NOT NULL,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    registration_opens_at TIMESTAMPTZ NOT NULL,
    registration_closes_at TIMESTAMPTZ NOT NULL,
    capacity INTEGER, -- NULL means unlimited
    walk_ins_enabled BOOLEAN NOT NULL DEFAULT true,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'registration_closed', 'completed', 'cancelled', 'archived')),
    banner_url TEXT,
    created_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_events_slug ON public.events(slug);
CREATE INDEX IF NOT EXISTS idx_events_status ON public.events(status);
CREATE INDEX IF NOT EXISTS idx_events_starts_at ON public.events(starts_at);

-- 4. EVENT REGISTRATIONS TABLE
CREATE TABLE IF NOT EXISTS public.event_registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    membership_id UUID NOT NULL REFERENCES public.memberships(id) ON DELETE RESTRICT,
    prn TEXT NOT NULL,
    student_name_snapshot TEXT NOT NULL,
    email TEXT NOT NULL,
    contact TEXT,
    registration_type TEXT NOT NULL DEFAULT 'online' CHECK (registration_type IN ('online', 'walk_in')),
    registered_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    registration_status TEXT NOT NULL DEFAULT 'confirmed' CHECK (registration_status IN ('confirmed', 'cancelled')),
    created_by TEXT,
    -- Strictly enforce: 1 student registration per event
    CONSTRAINT uq_event_student UNIQUE (event_id, prn)
);

CREATE INDEX IF NOT EXISTS idx_event_reg_event_id ON public.event_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_event_reg_prn ON public.event_registrations(prn);

-- 5. ATTENDANCE TABLE
CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    registration_id UUID NOT NULL REFERENCES public.event_registrations(id) ON DELETE CASCADE,
    prn TEXT NOT NULL,
    checked_in_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    checked_in_by TEXT NOT NULL, -- Profile ID / staff who marked present
    checked_in_by_name TEXT NOT NULL,
    method TEXT NOT NULL CHECK (method IN ('lookup', 'walk_in')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    -- Strictly enforce: exactly 1 successful attendance check-in per registration
    CONSTRAINT uq_attendance_registration UNIQUE (registration_id)
);

CREATE INDEX IF NOT EXISTS idx_attendance_event_id ON public.attendance(event_id);
CREATE INDEX IF NOT EXISTS idx_attendance_prn ON public.attendance(prn);

-- 6. EVENT STAFF TABLE (Role Delegation)
CREATE TABLE IF NOT EXISTS public.event_staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    assigned_role TEXT NOT NULL CHECK (assigned_role IN ('lead', 'volunteer')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_event_staff UNIQUE (event_id, profile_id)
);

-- 7. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id TEXT NOT NULL,
    actor_name TEXT NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- ====================================================================
-- ATOMIC STORED PROCEDURES (Concurrency Protection)
-- ====================================================================

-- Function: Mark attendance safely with duplicate prevention
CREATE OR REPLACE FUNCTION public.check_in_attendee(
    p_event_id UUID,
    p_registration_id UUID,
    p_actor_id TEXT,
    p_actor_name TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_reg RECORD;
    v_att_id UUID;
BEGIN
    -- Lock registration row for update
    SELECT * INTO v_reg
    FROM public.event_registrations
    WHERE id = p_registration_id AND event_id = p_event_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Registration not found for this event');
    END IF;

    -- Check if already checked in
    IF EXISTS (SELECT 1 FROM public.attendance WHERE registration_id = p_registration_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Attendee is already checked in');
    END IF;

    -- Insert attendance record
    INSERT INTO public.attendance (event_id, registration_id, prn, checked_in_by, checked_in_by_name, method)
    VALUES (p_event_id, p_registration_id, v_reg.prn, p_actor_id, p_actor_name, 'lookup')
    RETURNING id INTO v_att_id;

    -- Insert audit log
    INSERT INTO public.audit_logs (actor_id, actor_name, action, entity_type, entity_id, metadata)
    VALUES (p_actor_id, p_actor_name, 'ATTENDANCE_CHECKIN', 'attendance', v_att_id::text,
            jsonb_build_object('prn', v_reg.prn, 'event_id', p_event_id));

    RETURN jsonb_build_object('success', true, 'attendance_id', v_att_id);
END;
$$;

-- Function: Walk-in registration and check-in executed atomically
CREATE OR REPLACE FUNCTION public.register_walk_in(
    p_event_id UUID,
    p_prn TEXT,
    p_email TEXT,
    p_contact TEXT,
    p_actor_id TEXT,
    p_actor_name TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_event RECORD;
    v_mem RECORD;
    v_reg_count INTEGER;
    v_reg_id UUID;
    v_att_id UUID;
    v_norm_prn TEXT;
BEGIN
    v_norm_prn := upper(trim(p_prn));

    -- Lock event row
    SELECT * INTO v_event
    FROM public.events
    WHERE id = p_event_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Event not found');
    END IF;

    IF NOT v_event.walk_ins_enabled THEN
        RETURN jsonb_build_object('success', false, 'error', 'Walk-in registration is not enabled for this event');
    END IF;

    -- Check membership
    SELECT * INTO v_mem
    FROM public.memberships
    WHERE prn = v_norm_prn;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'PRN not in SESA membership records. Student must pay membership fee first.');
    END IF;

    IF v_mem.payment_status <> 'paid' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Membership fee is not verified as paid.');
    END IF;

    -- Check if already registered
    IF EXISTS (SELECT 1 FROM public.event_registrations WHERE event_id = p_event_id AND prn = v_norm_prn) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Student is already registered. Check regular attendance desk.');
    END IF;

    -- Check capacity
    IF v_event.capacity IS NOT NULL THEN
        SELECT count(*) INTO v_reg_count
        FROM public.event_registrations
        WHERE event_id = p_event_id;

        IF v_reg_count >= v_event.capacity THEN
            RETURN jsonb_build_object('success', false, 'error', 'Event is at maximum capacity.');
        END IF;
    END IF;

    -- Create registration
    INSERT INTO public.event_registrations (
        event_id, membership_id, prn, student_name_snapshot, email, contact, registration_type, created_by
    )
    VALUES (
        p_event_id, v_mem.id, v_norm_prn, v_mem.full_name, coalesce(p_email, v_mem.email, v_norm_prn || '@mitaoe.ac.in'),
        coalesce(p_contact, v_mem.contact, ''), 'walk_in', p_actor_id
    )
    RETURNING id INTO v_reg_id;

    -- Create attendance
    INSERT INTO public.attendance (
        event_id, registration_id, prn, checked_in_by, checked_in_by_name, method
    )
    VALUES (
        p_event_id, v_reg_id, v_norm_prn, p_actor_id, p_actor_name, 'walk_in'
    )
    RETURNING id INTO v_att_id;

    -- Insert audit log
    INSERT INTO public.audit_logs (actor_id, actor_name, action, entity_type, entity_id, metadata)
    VALUES (p_actor_id, p_actor_name, 'WALK_IN_REGISTRATION_AND_CHECKIN', 'attendance', v_att_id::text,
            jsonb_build_object('prn', v_norm_prn, 'event_id', p_event_id));

    RETURN jsonb_build_object(
        'success', true,
        'registration_id', v_reg_id,
        'attendance_id', v_att_id,
        'student_name', v_mem.full_name
    );
END;
$$;

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteer_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Volunteer Accounts: Staff can read volunteer accounts for desk coordination
CREATE POLICY "Staff can view volunteer accounts"
ON public.volunteer_accounts FOR SELECT
USING (auth.jwt() ->> 'role' IN ('super_admin', 'organizer', 'volunteer'));

CREATE POLICY "Admins can manage volunteer accounts"
ON public.volunteer_accounts FOR ALL
USING (auth.jwt() ->> 'role' IN ('super_admin'));

-- Events: Everyone can read published/completed events
CREATE POLICY "Public can view published events"
ON public.events FOR SELECT
USING (status IN ('published', 'registration_closed', 'completed'));

-- Events: Volunteers, Organizers & Super Admin can manage events (Per Senior Feedback)
CREATE POLICY "Staff can manage events"
ON public.events FOR ALL
USING (auth.jwt() ->> 'role' IN ('super_admin', 'organizer', 'volunteer'));

-- Memberships: Volunteers, Organizers & Super Admin can view, register, and update memberships
CREATE POLICY "Staff can view and manage memberships"
ON public.memberships FOR ALL
USING (auth.jwt() ->> 'role' IN ('super_admin', 'organizer', 'volunteer'));

-- Registrations: Public can create registrations for open published events
CREATE POLICY "Students can register for open events"
ON public.event_registrations FOR INSERT
WITH CHECK (true);

-- Attendance: Volunteers and Organizers can view and record attendance
CREATE POLICY "Staff can manage attendance"
ON public.attendance FOR ALL
USING (auth.jwt() ->> 'role' IN ('super_admin', 'organizer', 'volunteer'));

-- ====================================================================
-- SEED DATA: 5 SIMULTANEOUS VOLUNTEER ACCOUNTS (Password: sesa2026)
-- ====================================================================
INSERT INTO public.volunteer_accounts (username, full_name, email, phone, role)
VALUES
    ('volunteer1', 'Rohit Deshmukh (Desk Volunteer 1)', 'rohit.deshmukh@mitaoe.ac.in', '9820110001', 'volunteer'),
    ('volunteer2', 'Aditi Patil (Desk Volunteer 2)', 'aditi.patil@mitaoe.ac.in', '9820110002', 'volunteer'),
    ('volunteer3', 'Sahil Kulkarni (Desk Volunteer 3)', 'sahil.kulkarni@mitaoe.ac.in', '9820110003', 'volunteer'),
    ('volunteer4', 'Neha Sharma (Desk Volunteer 4)', 'neha.sharma@mitaoe.ac.in', '9820110004', 'volunteer'),
    ('volunteer5', 'Kunal Shinde (Desk Volunteer 5)', 'kunal.shinde@mitaoe.ac.in', '9820110005', 'volunteer'),
    ('organizer_lead', 'Neha Kulkarni (Event Lead)', 'neha.kulkarni@mitaoe.ac.in', '9820110010', 'lead'),
    ('sesa_admin', 'Atharva Gaikwad (Super Admin)', 'sesa.admin@mitaoe.ac.in', '9820110099', 'super_admin')
ON CONFLICT (username) DO NOTHING;

