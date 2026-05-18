-- Dev seed data: Asaka Bank, Polyclinic №7, Beeline (as in the prototype)
-- Run: docker exec -i zeyvo-postgres psql -U zeyvo -d zeyvo < seed.sql

SET search_path TO app, public;

-- ── Organizations ──────────────────────────────────────────────────────────────
INSERT INTO app.organization (id, slug, name, plan, settings) VALUES
  ('11111111-0000-0000-0000-000000000001', 'asaka-bank', 'Asaka Bank', 'growth',
   '{"primary_color": "#0055A5", "logo_url": null}'),
  ('11111111-0000-0000-0000-000000000002', 'polyclinic-7', 'Poliklinika №7', 'starter',
   '{"primary_color": "#00A859", "logo_url": null}'),
  ('11111111-0000-0000-0000-000000000003', 'beeline-uz', 'Beeline Uzbekistan', 'growth',
   '{"primary_color": "#FFD700", "logo_url": null}')
ON CONFLICT DO NOTHING;

-- ── Branches ───────────────────────────────────────────────────────────────────
INSERT INTO app.branch (id, organization_id, slug, name, short_name, type, address, lat, lng, capacity, settings) VALUES
  -- Asaka Bank
  ('22222222-0000-0000-0000-000000000001',
   '11111111-0000-0000-0000-000000000001',
   'asaka-mustakillik', 'Asaka Bank — Mustaqillik ko''cha', 'Mustaqillik', 'bank',
   'Mustaqillik ko''cha 54, Toshkent', 41.2995, 69.2401, 120,
   '{"allow_remote": true, "sms_on_call": true}'),
  ('22222222-0000-0000-0000-000000000002',
   '11111111-0000-0000-0000-000000000001',
   'asaka-chilonzor', 'Asaka Bank — Chilonzor filiali', 'Chilonzor', 'bank',
   'Bunyodkor ko''cha 12, Toshkent', 41.2764, 69.2014, 80,
   '{"allow_remote": true, "sms_on_call": true}'),
  -- Polyclinic №7
  ('22222222-0000-0000-0000-000000000003',
   '11111111-0000-0000-0000-000000000002',
   'poly7-main', 'Poliklinika №7 — Asosiy bino', 'Poliklinika 7', 'clinic',
   'Amir Temur ko''cha 108, Toshkent', 41.3111, 69.2797, 200,
   '{"allow_remote": true, "sms_on_call": false}'),
  -- Beeline
  ('22222222-0000-0000-0000-000000000004',
   '11111111-0000-0000-0000-000000000003',
   'beeline-broadway', 'Beeline — Broadway', 'Broadway', 'telecom',
   'Sayilgoh ko''cha 2, Toshkent', 41.2969, 69.2741, 60,
   '{"allow_remote": true, "sms_on_call": true}')
ON CONFLICT DO NOTHING;

-- ── Services ───────────────────────────────────────────────────────────────────
INSERT INTO app.service (id, branch_id, code, name, name_i18n, avg_duration_s, priority, display_order) VALUES
  -- Asaka Mustaqillik
  ('33333333-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001',
   'A', 'Depozitlar', '{"ru": "Депозиты", "en": "Deposits"}', 300, 0, 1),
  ('33333333-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000001',
   'B', 'Kreditlar', '{"ru": "Кредиты", "en": "Loans"}', 600, 0, 2),
  ('33333333-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000001',
   'C', 'Kartalar', '{"ru": "Карты", "en": "Cards"}', 180, 0, 3),
  ('33333333-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000001',
   'D', 'Valyuta', '{"ru": "Валюта", "en": "Currency"}', 240, 0, 4),
  -- Asaka Chilonzor
  ('33333333-0000-0000-0000-000000000005', '22222222-0000-0000-0000-000000000002',
   'A', 'Depozitlar', '{"ru": "Депозиты", "en": "Deposits"}', 300, 0, 1),
  ('33333333-0000-0000-0000-000000000006', '22222222-0000-0000-0000-000000000002',
   'B', 'Kreditlar', '{"ru": "Кредиты", "en": "Loans"}', 600, 0, 2),
  ('33333333-0000-0000-0000-000000000007', '22222222-0000-0000-0000-000000000002',
   'C', 'Kartalar', '{"ru": "Карты", "en": "Cards"}', 180, 0, 3),
  -- Polyclinic №7
  ('33333333-0000-0000-0000-000000000008', '22222222-0000-0000-0000-000000000003',
   'A', 'Umumiy shifokor', '{"ru": "Терапевт", "en": "General Practitioner"}', 600, 0, 1),
  ('33333333-0000-0000-0000-000000000009', '22222222-0000-0000-0000-000000000003',
   'B', 'Mutaxassis', '{"ru": "Специалист", "en": "Specialist"}', 900, 0, 2),
  ('33333333-0000-0000-0000-000000000010', '22222222-0000-0000-0000-000000000003',
   'C', 'Laboratoriya', '{"ru": "Лаборатория", "en": "Lab"}', 120, 0, 3),
  -- Beeline
  ('33333333-0000-0000-0000-000000000011', '22222222-0000-0000-0000-000000000004',
   'A', 'Aloqa va tarif', '{"ru": "Связь и тарифы", "en": "Plans & Tariffs"}', 300, 0, 1),
  ('33333333-0000-0000-0000-000000000012', '22222222-0000-0000-0000-000000000004',
   'B', 'Qurilmalar', '{"ru": "Устройства", "en": "Devices"}', 480, 0, 2),
  ('33333333-0000-0000-0000-000000000013', '22222222-0000-0000-0000-000000000004',
   'C', 'To''lov va hisob', '{"ru": "Платежи и счёт", "en": "Payments"}', 240, 0, 3)
ON CONFLICT DO NOTHING;

-- ── Window desks ───────────────────────────────────────────────────────────────
INSERT INTO app.window_desk (id, branch_id, number, label, status, service_codes) VALUES
  ('44444444-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', 1, '1-oyna', 'open', '{A,C}'),
  ('44444444-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000001', 2, '2-oyna', 'open', '{B}'),
  ('44444444-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000001', 3, '3-oyna', 'open', '{D}'),
  ('44444444-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000001', 4, '4-oyna', 'closed', '{}'),
  ('44444444-0000-0000-0000-000000000005', '22222222-0000-0000-0000-000000000002', 1, '1-oyna', 'open', '{A,B,C}'),
  ('44444444-0000-0000-0000-000000000006', '22222222-0000-0000-0000-000000000002', 2, '2-oyna', 'open', '{A,B,C}'),
  ('44444444-0000-0000-0000-000000000007', '22222222-0000-0000-0000-000000000003', 1, 'Qabul 1', 'open', '{A}'),
  ('44444444-0000-0000-0000-000000000008', '22222222-0000-0000-0000-000000000003', 2, 'Qabul 2', 'open', '{B}'),
  ('44444444-0000-0000-0000-000000000009', '22222222-0000-0000-0000-000000000003', 3, 'Lab qabul', 'open', '{C}'),
  ('44444444-0000-0000-0000-000000000010', '22222222-0000-0000-0000-000000000004', 1, '1-oyna', 'open', '{A,B,C}'),
  ('44444444-0000-0000-0000-000000000011', '22222222-0000-0000-0000-000000000004', 2, '2-oyna', 'idle', '{A,B,C}')
ON CONFLICT DO NOTHING;

-- ── Operating hours (Mon-Sat 9-18, Fri 9-17) ──────────────────────────────────
INSERT INTO app.operating_hours (branch_id, day_of_week, open_at, close_at)
SELECT b.id, d.dow, '09:00'::time, CASE WHEN d.dow = 5 THEN '17:00'::time ELSE '18:00'::time END
FROM app.branch b
CROSS JOIN (VALUES (1),(2),(3),(4),(5),(6)) AS d(dow)
WHERE b.id IN (
  '22222222-0000-0000-0000-000000000001',
  '22222222-0000-0000-0000-000000000002',
  '22222222-0000-0000-0000-000000000003',
  '22222222-0000-0000-0000-000000000004'
)
ON CONFLICT DO NOTHING;

-- ── Ticket counters ────────────────────────────────────────────────────────────
INSERT INTO app.ticket_counter (branch_id, service_code, next_val)
SELECT s.branch_id, s.code, 101
FROM app.service s
WHERE s.branch_id IN (
  '22222222-0000-0000-0000-000000000001',
  '22222222-0000-0000-0000-000000000002',
  '22222222-0000-0000-0000-000000000003',
  '22222222-0000-0000-0000-000000000004'
)
ON CONFLICT DO NOTHING;

-- ── Demo user accounts ─────────────────────────────────────────────────────────
-- Passwords are handled by auth; these are skeleton accounts for demo roles
INSERT INTO app.user_account (id, organization_id, phone, full_name, locale) VALUES
  ('55555555-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001',
   '+998901000001', 'Botir Yusupov', 'uz'),
  ('55555555-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001',
   '+998901000002', 'Malika Rahimova', 'uz'),
  ('55555555-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000002',
   '+998901000003', 'Dr. Saidov Alisher', 'uz')
ON CONFLICT DO NOTHING;

INSERT INTO app.user_role (user_id, organization_id, role, branch_id) VALUES
  ('55555555-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'org_admin', NULL),
  ('55555555-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001', 'operator',
   '22222222-0000-0000-0000-000000000001'),
  ('55555555-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000002', 'org_admin', NULL)
ON CONFLICT DO NOTHING;

-- ── Sample waiting tickets ─────────────────────────────────────────────────────
INSERT INTO app.ticket (id, organization_id, branch_id, service_id, number, source, priority, status, joined_at)
VALUES
  (gen_random_uuid(), '11111111-0000-0000-0000-000000000001',
   '22222222-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001',
   'A-101', 'walk_in', 0, 'waiting', now() - interval '25 minutes'),
  (gen_random_uuid(), '11111111-0000-0000-0000-000000000001',
   '22222222-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001',
   'A-102', 'remote', 0, 'waiting', now() - interval '20 minutes'),
  (gen_random_uuid(), '11111111-0000-0000-0000-000000000001',
   '22222222-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000002',
   'B-101', 'walk_in', 0, 'waiting', now() - interval '15 minutes'),
  (gen_random_uuid(), '11111111-0000-0000-0000-000000000001',
   '22222222-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000003',
   'C-101', 'telegram', 0, 'waiting', now() - interval '10 minutes'),
  (gen_random_uuid(), '11111111-0000-0000-0000-000000000001',
   '22222222-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001',
   'A-103', 'remote', 0, 'waiting', now() - interval '5 minutes'),
  (gen_random_uuid(), '11111111-0000-0000-0000-000000000003',
   '22222222-0000-0000-0000-000000000003', '33333333-0000-0000-0000-000000000008',
   'A-101', 'walk_in', 0, 'waiting', now() - interval '30 minutes'),
  (gen_random_uuid(), '11111111-0000-0000-0000-000000000003',
   '22222222-0000-0000-0000-000000000003', '33333333-0000-0000-0000-000000000009',
   'B-101', 'walk_in', 10, 'waiting', now() - interval '45 minutes')
ON CONFLICT DO NOTHING;
