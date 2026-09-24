-- Seed data mirroring src/lib/mock-data.ts, so the app has something real
-- to show once wired to Postgres. Run after 0001_init.sql. Safe to re-run
-- (idempotent via fixed UUIDs + ON CONFLICT DO NOTHING).

insert into accounts (id, name, type, created_at) values
  ('a1111111-0000-0000-0000-000000000001', 'Crash Champions', 'commercial', '2025-01-10'),
  ('a1111111-0000-0000-0000-000000000002', 'DriveTime', 'commercial', '2025-01-14'),
  ('a1111111-0000-0000-0000-000000000003', 'Big Brand Tire & Service', 'commercial', '2025-02-02'),
  ('a1111111-0000-0000-0000-000000000004', 'CVS', 'commercial', '2025-02-20')
on conflict (id) do nothing;

insert into sites (id, account_id, store_code, name, address, contact_name, contact_phone, contact_email, hours_of_operation) values
  ('51111111-0000-0000-0000-000000000001', 'a1111111-0000-0000-0000-000000000001', 'CC549', 'Crash Champions - CC549', '1420 Oak Cliff Ave, Dallas, TX', 'Maria White', '214-555-0132', null, 'Mon-Fri 8a-6p'),
  ('51111111-0000-0000-0000-000000000002', 'a1111111-0000-0000-0000-000000000002', '0172', 'DriveTime - 0172', '889 Northgate Dr, Little Elm, TX', 'Jordan Reyes', '972-555-0110', null, 'Mon-Sat 9a-7p'),
  ('51111111-0000-0000-0000-000000000003', 'a1111111-0000-0000-0000-000000000003', '0041', 'Big Brand Tire - 0041', '5521 Coast Hwy, Oceanside, CA', 'Dana Kim', '760-555-0198', null, 'Mon-Sat 7a-6p')
on conflict (id) do nothing;

insert into vendors (id, name, trades, phone, email, coi_expires_at, license_expires_at, rate_card_hourly, is_last_resort, active) values
  ('7e111111-0000-0000-0000-000000000001', 'Metro Plumbing Co.', array['plumbing'], '469-555-0110', 'dispatch@metroplumbing.example', '2026-11-01', '2027-03-01', 95, false, true),
  ('7e111111-0000-0000-0000-000000000002', 'Apex HVAC Services', array['hvac'], '214-555-0155', 'service@apexhvac.example', '2026-10-05', '2026-09-20', 110, false, true),
  ('7e111111-0000-0000-0000-000000000003', 'Lone Star Electric', array['electrical'], '972-555-0177', 'ops@lonestarelectric.example', '2026-12-15', '2027-01-10', 105, false, true),
  ('7e111111-0000-0000-0000-000000000004', 'YHM Services', array['handyman', 'general_construction'], '800-555-0199', 'oscar@yhmservices.example', '2026-08-30', '2026-08-30', 85, true, true)
on conflict (id) do nothing;

insert into work_orders (id, wo_number, legacy_wo_number, site_id, trade, priority, status, description, po_number, nte, dne, vendor_id, sla_respond_by, sla_resolve_by, created_at, closed_at, source, external_tracking_number, client_extended_status, category, gl_code, reporter_name, reporter_cell) values
  ('90000001-0000-0000-0000-000000000001', 'WO-3021', 'CC-88213', '51111111-0000-0000-0000-000000000001', 'doors', 'emergency_4_hour', 'quote_with_client', 'Overhead door failure, security exposure', 'PO-55210', 140, 140, '7e111111-0000-0000-0000-000000000004', '2026-09-24T15:00:00Z', '2026-09-24T19:00:00Z', '2026-09-24T11:20:00Z', null, 'service_channel', '364381220', 'WAITING FOR APPROVAL', 'building_rm', null, 'Alex Rivera', '214-555-0199'),
  ('90000001-0000-0000-0000-000000000002', 'WO-3022', null, '51111111-0000-0000-0000-000000000002', 'hvac', 'priority_24_hour', 'tech_onsite', 'RTU not cooling, high indoor temp', 'PO-55298', 900, 900, '7e111111-0000-0000-0000-000000000002', '2026-09-25T10:00:00Z', null, '2026-09-24T09:05:00Z', null, 'service_channel', '364381509', 'ON SITE', 'maintenance', null, 'Sam Okafor', '972-555-0144'),
  ('90000001-0000-0000-0000-000000000003', 'WO-3023', 'BBT-1187', '51111111-0000-0000-0000-000000000003', 'plumbing', 'standard_48_hour', 'pending_quote', 'Slow drain, restroom 2', 'PO-55301', null, null, '7e111111-0000-0000-0000-000000000001', '2026-09-26T18:00:00Z', null, '2026-09-23T16:40:00Z', null, 'service_channel', '364379981', 'WAITING FOR QUOTE', 'maintenance', null, 'Priya Nair', '760-555-0177'),
  ('90000001-0000-0000-0000-000000000004', 'WO-3018', null, '51111111-0000-0000-0000-000000000001', 'electrical', 'priority_24_hour', 'in_quality_assurance', 'Outlet not working, back office', 'PO-55177', 260, 260, '7e111111-0000-0000-0000-000000000003', '2026-09-22T18:00:00Z', '2026-09-23T09:10:00Z', '2026-09-21T14:00:00Z', null, 'service_channel', '364375620', 'PENDING REVIEW', 'building_rm', null, 'Alex Rivera', '214-555-0199'),
  ('90000001-0000-0000-0000-000000000005', 'WO-3010', 'DT-4471', '51111111-0000-0000-0000-000000000002', 'hvac', 'routine_scheduled', 'closed', 'Quarterly PM, rooftop units', 'PO-54980', 400, 400, '7e111111-0000-0000-0000-000000000002', null, null, '2026-09-10T08:00:00Z', '2026-09-18T17:30:00Z', 'service_channel', '364360142', 'INVOICED', 'maintenance', null, null, null),
  ('90000001-0000-0000-0000-000000000006', 'WO-3024', null, '51111111-0000-0000-0000-000000000002', 'plumbing', 'emergency_same_day', 'assigned', 'Sewage backup, restroom flooding', 'PO-55320', 500, 500, '7e111111-0000-0000-0000-000000000001', '2026-09-24T14:00:00Z', '2026-09-24T13:00:00Z', '2026-09-24T10:00:00Z', null, 'service_channel', '364381777', 'DISPATCH CONFIRMED', 'building_rm', null, 'Sam Okafor', '972-555-0144'),
  ('90000001-0000-0000-0000-000000000007', 'WO-3025', 'CC-88240', '51111111-0000-0000-0000-000000000001', 'hvac', 'priority_24_hour', 'new', 'No cooling, server closet', null, null, null, null, '2026-09-25T12:00:00Z', null, '2026-09-24T13:10:00Z', null, 'service_channel', '364381902', null, null, null, 'Alex Rivera', '214-555-0199'),
  ('90000001-0000-0000-0000-000000000008', 'WO-3015', 'DT-4488', '51111111-0000-0000-0000-000000000002', 'roofing', 'standard_48_hour', 'ready_to_bill', 'Roof leak over sales floor', 'PO-55090', 1200, 1200, '7e111111-0000-0000-0000-000000000004', null, null, '2026-09-18T09:00:00Z', null, 'service_channel', '364370233', 'COMPLETED/CONFIRMED', 'capex', '6420-CAPEX', null, null),
  ('90000001-0000-0000-0000-000000000009', 'WO-3005', 'BBT-1150', '51111111-0000-0000-0000-000000000003', 'electrical', 'routine_scheduled', 'invoiced', 'Panel upgrade, bay 4', 'PO-54890', 3200, 3200, '7e111111-0000-0000-0000-000000000003', null, null, '2026-09-05T09:00:00Z', null, 'service_channel', '364355510', 'UNDER REVIEW BY BBTS PM P2', 'capex', '7100-CAPEX', null, null)
on conflict (id) do nothing;

insert into nte_increases (work_order_id, amount, approved_by, approved_at, method, note) values
  ('90000001-0000-0000-0000-000000000002', 900, 'Jordan Reyes', '2026-09-24T10:40:00Z', 'phone', 'Verbal increase from $650 after tech found a failed compressor')
on conflict do nothing;
