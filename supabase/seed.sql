-- SEION Phase 1 MVP seed. Demo catalog only — not production supplier quotes.
-- Plant admin users are created via invite using SEED_ADMIN_EMAIL (no passwords in git).

-- ---------------------------------------------------------------------------
-- Tenant
-- ---------------------------------------------------------------------------

insert into public.tenants (name, legal_entity_name, gst_number, tier_level, industrial_cluster, is_active)
select 'SEION Demo Plant', 'SEION Demo Plant Private Limited', null, 'TIER_2', 'Chennai', true
where not exists (select 1 from public.tenants where name = 'SEION Demo Plant');

-- ---------------------------------------------------------------------------
-- Standard specs (fasteners, steels, coating flags)
-- canonical_key aligns with lib/matching/canonicalize.ts prefixes
-- ---------------------------------------------------------------------------

insert into public.standard_specs (body, code, part_family, canonical_key, mechanical, notes)
values
  -- Hex socket cap screw: DIN 912 / ISO 4762 → IS 1367 Part 3 / IS 2269
  ('DIN', 'DIN 912', 'hex_socket_cap_screw', 'DIN912',
    '{"property_class":"8.8","tensile_mpa_min":800,"yield_mpa_min":640,"thread_fit":"6g"}'::jsonb,
    'Hex socket head cap screw'),
  ('ISO', 'ISO 4762', 'hex_socket_cap_screw', 'ISO4762',
    '{"property_class":"8.8","tensile_mpa_min":800,"yield_mpa_min":640,"thread_fit":"6g"}'::jsonb,
    'Hex socket head cap screw'),
  ('IS', 'IS 1367 Part 3', 'hex_socket_cap_screw', 'IS1367PART3',
    '{"property_class":"8.8","tensile_mpa_min":800,"yield_mpa_min":640,"thread_fit":"6g"}'::jsonb,
    'Mechanical properties for fasteners; pair with IS 2269 product standard'),
  ('IS', 'IS 2269', 'hex_socket_cap_screw', 'IS2269',
    '{"property_class":"8.8","tensile_mpa_min":800,"yield_mpa_min":640,"thread_fit":"6g"}'::jsonb,
    'Hexagon socket head cap screws'),

  -- Hex head bolt: DIN 931/933 / ISO 4014/4017 → IS 1364 Part 1 & 2
  ('DIN', 'DIN 931', 'hex_head_bolt', 'DIN931',
    '{"property_class":"8.8","tensile_mpa_min":800,"yield_mpa_min":640,"thread_fit":"6g"}'::jsonb,
    'Partial-thread hexagon head bolt'),
  ('DIN', 'DIN 933', 'hex_head_bolt', 'DIN933',
    '{"property_class":"8.8","tensile_mpa_min":800,"yield_mpa_min":640,"thread_fit":"6g"}'::jsonb,
    'Full-thread hexagon head bolt'),
  ('ISO', 'ISO 4014', 'hex_head_bolt', 'ISO4014',
    '{"property_class":"8.8","tensile_mpa_min":800,"yield_mpa_min":640,"thread_fit":"6g"}'::jsonb,
    'Partial-thread hexagon head bolt'),
  ('ISO', 'ISO 4017', 'hex_head_bolt', 'ISO4017',
    '{"property_class":"8.8","tensile_mpa_min":800,"yield_mpa_min":640,"thread_fit":"6g"}'::jsonb,
    'Full-thread hexagon head screw'),
  ('IS', 'IS 1364 Part 1', 'hex_head_bolt', 'IS1364PART1',
    '{"property_class":"8.8","tensile_mpa_min":800,"yield_mpa_min":640,"thread_fit":"6g"}'::jsonb,
    'Hexagon head bolts (product grade A and B)'),
  ('IS', 'IS 1364 Part 2', 'hex_head_bolt', 'IS1364PART2',
    '{"property_class":"8.8","tensile_mpa_min":800,"yield_mpa_min":640,"thread_fit":"6g"}'::jsonb,
    'Hexagon head screws (product grade A and B)'),

  -- Hex nut: DIN 934 / ISO 4032 → IS 1364 Part 3
  ('DIN', 'DIN 934', 'hex_nut', 'DIN934',
    '{"property_class":"8","thread_fit":"6H"}'::jsonb,
    'Hexagon nut, style 1'),
  ('ISO', 'ISO 4032', 'hex_nut', 'ISO4032',
    '{"property_class":"8","thread_fit":"6H"}'::jsonb,
    'Hexagon regular nuts (style 1)'),
  ('IS', 'IS 1364 Part 3', 'hex_nut', 'IS1364PART3',
    '{"property_class":"8","thread_fit":"6H"}'::jsonb,
    'Hexagon nuts (product grade A and B)'),

  -- Flat washer: DIN 125 / ISO 7089 → IS 2016
  ('DIN', 'DIN 125', 'flat_washer', 'DIN125',
    '{"hardness":"200 HV"}'::jsonb,
    'Plain washer Form A'),
  ('ISO', 'ISO 7089', 'flat_washer', 'ISO7089',
    '{"hardness":"200 HV"}'::jsonb,
    'Plain washers — Normal series, Product grade A'),
  ('IS', 'IS 2016', 'flat_washer', 'IS2016',
    '{"hardness":"200 HV"}'::jsonb,
    'Plain washers'),

  -- Spring lock washer: DIN 127 / ISO 6157 → IS 3063
  ('DIN', 'DIN 127', 'spring_lock_washer', 'DIN127',
    '{"hardness":"44-51 HRC"}'::jsonb,
    'Spring lock washer Form B'),
  ('ISO', 'ISO 6157', 'spring_lock_washer', 'ISO6157',
    '{"hardness":"44-51 HRC"}'::jsonb,
    'Fasteners — Surface discontinuities (paired in seed matrix)'),
  ('IS', 'IS 3063', 'spring_lock_washer', 'IS3063',
    '{"hardness":"44-51 HRC"}'::jsonb,
    'Fasteners — Single coil spring lock washers'),

  -- Countersunk socket: DIN 7991 / ISO 10642 → IS 6761
  ('DIN', 'DIN 7991', 'countersunk_socket_bolt', 'DIN7991',
    '{"property_class":"10.9","tensile_mpa_min":1040,"yield_mpa_min":940,"thread_fit":"6g"}'::jsonb,
    'Hexagon socket countersunk head screw'),
  ('ISO', 'ISO 10642', 'countersunk_socket_bolt', 'ISO10642',
    '{"property_class":"10.9","tensile_mpa_min":1040,"yield_mpa_min":940,"thread_fit":"6g"}'::jsonb,
    'Hexagon socket countersunk head screws'),
  ('IS', 'IS 6761', 'countersunk_socket_bolt', 'IS6761',
    '{"property_class":"10.9","tensile_mpa_min":1040,"yield_mpa_min":940,"thread_fit":"6g"}'::jsonb,
    'Countersunk head screws'),

  -- Threaded rod: DIN 975/976 → IS 1862
  ('DIN', 'DIN 975', 'threaded_rod', 'DIN975',
    '{"property_class":"8.8","tensile_mpa_min":800,"thread_fit":"6g"}'::jsonb,
    'Threaded rod (metre lengths)'),
  ('DIN', 'DIN 976', 'threaded_rod', 'DIN976',
    '{"property_class":"8.8","tensile_mpa_min":800,"thread_fit":"6g"}'::jsonb,
    'Stud bolts / threaded rod'),
  ('IS', 'IS 1862', 'threaded_rod', 'IS1862',
    '{"property_class":"8.8","tensile_mpa_min":800,"thread_fit":"6g"}'::jsonb,
    'Studs'),

  -- Steels
  ('EN', 'EN 10130 FeP04', 'cold_rolled_sheet', 'EN10130',
    '{"tensile_mpa_min":270,"yield_mpa_min":140}'::jsonb,
    'Cold-rolled deep-drawing sheet'),
  ('IS', 'IS 513 CR4/CR5', 'cold_rolled_sheet', 'IS513',
    '{"tensile_mpa_min":270,"yield_mpa_min":140}'::jsonb,
    'Cold-reduced low carbon steel sheet (CR4/CR5)'),

  ('DIN', '16MnCr5', 'case_hardening_steel', '16MNCR5',
    '{"tensile_mpa_min":800,"yield_mpa_min":590}'::jsonb,
    'DIN 1.7131 case-hardening alloy steel'),
  ('IS', 'IS 5517 16MnCr5', 'case_hardening_steel', 'IS551716MNCR5',
    '{"tensile_mpa_min":800,"yield_mpa_min":590}'::jsonb,
    'Steels for hardening and tempering — 16MnCr5'),

  ('DIN', '42CrMo4', 'through_hardening_steel', '42CRMO4',
    '{"tensile_mpa_min":900,"yield_mpa_min":650}'::jsonb,
    'DIN 1.7225 through-hardening alloy steel'),
  ('IS', 'IS 5517 40Cr4Mo2', 'through_hardening_steel', 'IS551740CR4MO2',
    '{"tensile_mpa_min":900,"yield_mpa_min":650}'::jsonb,
    'Steels for hardening and tempering — 40Cr4Mo2'),

  ('EN', 'S235JR', 'structural_steel', 'S235JR',
    '{"tensile_mpa_min":410,"yield_mpa_min":250}'::jsonb,
    'EN 10025-2 structural steel'),
  ('IS', 'IS 2062 E250', 'structural_steel', 'IS2062',
    '{"tensile_mpa_min":410,"yield_mpa_min":250}'::jsonb,
    'Hot-rolled medium and high tensile structural steel Grade E250'),

  ('DIN', '55Cr3', 'spring_steel', '55CR3',
    '{"tensile_mpa_min":1350,"yield_mpa_min":1150,"hardness":"spring"}'::jsonb,
    'DIN 1.7176 spring steel'),
  ('IS', 'IS 4454 Part 1', 'spring_steel', 'IS4454PART1',
    '{"tensile_mpa_min":1350,"yield_mpa_min":1150}'::jsonb,
    'Steel wires for mechanical springs — unalloyed'),

  -- Coatings (flags, not a full catalog)
  ('IS', 'IS 1367 Part 11', 'coating', 'IS1367PART11',
    '{}'::jsonb,
    'FLAG: zinc electroplate. Typical 72–120 h NSS. Not equivalent to zinc flake for underbody.'),
  ('ISO', 'ISO 10683', 'coating', 'ISO10683',
    '{}'::jsonb,
    'FLAG: zinc-flake coating. Pair with IS 16647. Typical 480–1000 h NSS.'),
  ('IS', 'IS 16647', 'coating', 'IS16647',
    '{}'::jsonb,
    'FLAG: zinc-flake coatings on fasteners. AIS-071/AIS-038 underbody often requires this class.'),
  ('IS', 'IS 3618', 'coating', 'IS3618',
    '{}'::jsonb,
    'FLAG: phosphate coating (friction control / lubrication), not a zinc-flake substitute.')
on conflict (canonical_key) do nothing;

-- ---------------------------------------------------------------------------
-- Equivalents — every §4.3 fastener and steel pair (foreign → IS)
-- ---------------------------------------------------------------------------

insert into public.standard_equivalents (from_spec_id, to_spec_id, equivalence, notes)
select f.id, t.id, v.equivalence, v.notes
from (
  values
    ('DIN912', 'IS1367PART3', 'EQUIVALENT', 'DIN 912 → IS 1367 Part 3'),
    ('DIN912', 'IS2269', 'EQUIVALENT', 'DIN 912 → IS 2269'),
    ('ISO4762', 'IS1367PART3', 'EQUIVALENT', 'ISO 4762 → IS 1367 Part 3'),
    ('ISO4762', 'IS2269', 'EQUIVALENT', 'ISO 4762 → IS 2269'),

    ('DIN931', 'IS1364PART1', 'EQUIVALENT', 'DIN 931 → IS 1364 Part 1'),
    ('DIN931', 'IS1364PART2', 'NEAR', 'DIN 931 grouped with IS 1364 Part 1 & 2'),
    ('DIN933', 'IS1364PART2', 'EQUIVALENT', 'DIN 933 → IS 1364 Part 2'),
    ('DIN933', 'IS1364PART1', 'NEAR', 'DIN 933 grouped with IS 1364 Part 1 & 2'),
    ('ISO4014', 'IS1364PART1', 'EQUIVALENT', 'ISO 4014 → IS 1364 Part 1'),
    ('ISO4014', 'IS1364PART2', 'NEAR', 'ISO 4014 grouped with IS 1364 Part 1 & 2'),
    ('ISO4017', 'IS1364PART2', 'EQUIVALENT', 'ISO 4017 → IS 1364 Part 2'),
    ('ISO4017', 'IS1364PART1', 'NEAR', 'ISO 4017 grouped with IS 1364 Part 1 & 2'),

    ('DIN934', 'IS1364PART3', 'EQUIVALENT', 'DIN 934 → IS 1364 Part 3'),
    ('ISO4032', 'IS1364PART3', 'EQUIVALENT', 'ISO 4032 → IS 1364 Part 3'),

    ('DIN125', 'IS2016', 'EQUIVALENT', 'DIN 125 → IS 2016'),
    ('ISO7089', 'IS2016', 'EQUIVALENT', 'ISO 7089 → IS 2016'),

    ('DIN127', 'IS3063', 'EQUIVALENT', 'DIN 127 → IS 3063'),
    ('ISO6157', 'IS3063', 'NEAR', 'Seed matrix pairs ISO 6157 with IS 3063'),

    ('DIN7991', 'IS6761', 'EQUIVALENT', 'DIN 7991 → IS 6761'),
    ('ISO10642', 'IS6761', 'EQUIVALENT', 'ISO 10642 → IS 6761'),

    ('DIN975', 'IS1862', 'EQUIVALENT', 'DIN 975 → IS 1862'),
    ('DIN976', 'IS1862', 'EQUIVALENT', 'DIN 976 → IS 1862'),

    ('EN10130', 'IS513', 'EQUIVALENT', 'EN 10130 FeP04 → IS 513 CR4/CR5'),
    ('16MNCR5', 'IS551716MNCR5', 'EQUIVALENT', '16MnCr5 → IS 5517 16MnCr5'),
    ('42CRMO4', 'IS551740CR4MO2', 'NEAR', '42CrMo4 → IS 5517 40Cr4Mo2'),
    ('S235JR', 'IS2062', 'EQUIVALENT', 'S235JR → IS 2062 E250'),
    ('55CR3', 'IS4454PART1', 'NEAR', '55Cr3 → IS 4454 Part 1'),

    ('ISO10683', 'IS16647', 'EQUIVALENT', 'Zinc flake: ISO 10683 ↔ IS 16647'),
    ('IS1367PART11', 'IS16647', 'NOT_EQUIVALENT', 'Electro-zinc is not a zinc-flake substitute for underbody NSS')
) as v(from_key, to_key, equivalence, notes)
join public.standard_specs f on f.canonical_key = v.from_key
join public.standard_specs t on t.canonical_key = v.to_key
on conflict (from_spec_id, to_spec_id) do nothing;

-- ---------------------------------------------------------------------------
-- Seed suppliers (labeled as seed / indicative)
-- ---------------------------------------------------------------------------

insert into public.suppliers (
  legal_name, brand_name, industrial_hub, state,
  iatf_16949_certified, iso_9001_certified, rating, average_lead_time_days
)
select v.legal_name, v.brand_name, v.industrial_hub, v.state,
       v.iatf, v.iso, v.rating, v.lead_days
from (
  values
    ('ChennaiFasteners Ltd (seed)', 'ChennaiFasteners', 'Chennai', 'Tamil Nadu', true, true, 4.70::numeric, 7),
    ('MumbaiSteel (seed)', 'MumbaiSteel', 'Mumbai', 'Maharashtra', true, true, 4.50::numeric, 14),
    ('TamilNadu Stamping (seed)', 'TN Stamping', 'Chennai', 'Tamil Nadu', false, true, 4.20::numeric, 12),
    ('ChennaiRubber (seed)', 'ChennaiRubber', 'Chennai', 'Tamil Nadu', false, true, 4.10::numeric, 16),
    ('IndiaFasteners (seed)', 'IndiaFasteners', 'Pune', 'Maharashtra', true, true, 4.60::numeric, 10),
    ('PuneFab (seed)', 'PuneFab', 'Pune', 'Maharashtra', true, true, 4.40::numeric, 11)
) as v(legal_name, brand_name, industrial_hub, state, iatf, iso, rating, lead_days)
where not exists (
  select 1 from public.suppliers s where s.legal_name = v.legal_name
);

-- ---------------------------------------------------------------------------
-- Indicative fastener catalog prices (INR / unit, seed only)
-- ---------------------------------------------------------------------------

insert into public.supplier_catalog_prices (supplier_id, standard_spec_id, unit_cost)
select s.id, spec.id, p.unit_cost
from (
  values
    ('ChennaiFasteners Ltd (seed)', 'IS1367PART3', 4.50::numeric),
    ('ChennaiFasteners Ltd (seed)', 'IS2269', 4.60::numeric),
    ('ChennaiFasteners Ltd (seed)', 'IS1364PART1', 3.20::numeric),
    ('ChennaiFasteners Ltd (seed)', 'IS1364PART2', 3.10::numeric),
    ('ChennaiFasteners Ltd (seed)', 'IS1364PART3', 1.15::numeric),
    ('ChennaiFasteners Ltd (seed)', 'IS2016', 0.35::numeric),
    ('ChennaiFasteners Ltd (seed)', 'IS3063', 0.48::numeric),
    ('ChennaiFasteners Ltd (seed)', 'IS6761', 5.10::numeric),
    ('ChennaiFasteners Ltd (seed)', 'IS1862', 12.00::numeric),

    ('IndiaFasteners (seed)', 'IS1367PART3', 4.80::numeric),
    ('IndiaFasteners (seed)', 'IS2269', 4.90::numeric),
    ('IndiaFasteners (seed)', 'IS1364PART1', 3.45::numeric),
    ('IndiaFasteners (seed)', 'IS1364PART2', 3.35::numeric),
    ('IndiaFasteners (seed)', 'IS1364PART3', 1.25::numeric),
    ('IndiaFasteners (seed)', 'IS2016', 0.40::numeric),
    ('IndiaFasteners (seed)', 'IS3063', 0.52::numeric),
    ('IndiaFasteners (seed)', 'IS6761', 5.40::numeric),
    ('IndiaFasteners (seed)', 'IS1862', 12.80::numeric),

    ('PuneFab (seed)', 'IS1367PART3', 5.05::numeric),
    ('PuneFab (seed)', 'IS2269', 5.15::numeric),
    ('PuneFab (seed)', 'IS1364PART1', 3.60::numeric),
    ('PuneFab (seed)', 'IS1364PART2', 3.50::numeric),
    ('PuneFab (seed)', 'IS1364PART3', 1.30::numeric),
    ('PuneFab (seed)', 'IS2016', 0.42::numeric),
    ('PuneFab (seed)', 'IS3063', 0.55::numeric),
    ('PuneFab (seed)', 'IS6761', 5.60::numeric),
    ('PuneFab (seed)', 'IS1862', 13.20::numeric)
) as p(supplier_name, spec_key, unit_cost)
join public.suppliers s on s.legal_name = p.supplier_name
join public.standard_specs spec on spec.canonical_key = p.spec_key
on conflict (supplier_id, standard_spec_id) do nothing;
