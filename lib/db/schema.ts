/**
 * Ordered schema migrations. `PRAGMA user_version` stores how many have been applied,
 * so only append to this list; never edit an entry that has shipped.
 */
export const MIGRATIONS: string[] = [
  `
  CREATE TABLE settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE standard_specs (
    id            TEXT PRIMARY KEY,
    body          TEXT NOT NULL CHECK (body IN ('DIN','ISO','IS','JIS','ASTM','SAE','AIS','EN')),
    code          TEXT NOT NULL,
    part_family   TEXT NOT NULL,
    canonical_key TEXT NOT NULL UNIQUE,
    mechanical    TEXT NOT NULL DEFAULT '{}',
    notes         TEXT,
    source_ref    TEXT,
    origin        TEXT NOT NULL DEFAULT 'PLANT' CHECK (origin IN ('SEED','PLANT')),
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL
  );

  CREATE TABLE standard_equivalents (
    id           TEXT PRIMARY KEY,
    from_spec_id TEXT NOT NULL REFERENCES standard_specs(id) ON DELETE CASCADE,
    to_spec_id   TEXT NOT NULL REFERENCES standard_specs(id) ON DELETE CASCADE,
    equivalence  TEXT NOT NULL CHECK (equivalence IN ('EQUIVALENT','NEAR','NOT_EQUIVALENT')),
    notes        TEXT,
    source_ref   TEXT,
    origin       TEXT NOT NULL DEFAULT 'PLANT' CHECK (origin IN ('SEED','PLANT')),
    created_at   TEXT NOT NULL,
    UNIQUE (from_spec_id, to_spec_id),
    CHECK (from_spec_id <> to_spec_id)
  );

  CREATE TABLE suppliers (
    id             TEXT PRIMARY KEY,
    name           TEXT NOT NULL UNIQUE,
    industrial_hub TEXT,
    state          TEXT,
    contact_name   TEXT,
    email          TEXT,
    phone          TEXT,
    bis_licence_no TEXT,
    iatf_16949     INTEGER NOT NULL DEFAULT 0 CHECK (iatf_16949 IN (0,1)),
    iso_9001       INTEGER NOT NULL DEFAULT 0 CHECK (iso_9001 IN (0,1)),
    rating         REAL CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5)),
    lead_time_days INTEGER CHECK (lead_time_days IS NULL OR lead_time_days >= 0),
    notes          TEXT,
    origin         TEXT NOT NULL DEFAULT 'PLANT' CHECK (origin IN ('SEED','PLANT')),
    created_at     TEXT NOT NULL,
    updated_at     TEXT NOT NULL
  );

  CREATE TABLE supplier_prices (
    id               TEXT PRIMARY KEY,
    supplier_id      TEXT NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    standard_spec_id TEXT NOT NULL REFERENCES standard_specs(id) ON DELETE CASCADE,
    unit_cost        REAL NOT NULL CHECK (unit_cost >= 0),
    lead_time_days   INTEGER CHECK (lead_time_days IS NULL OR lead_time_days >= 0),
    valid_until      TEXT,
    source           TEXT NOT NULL DEFAULT 'MANUAL' CHECK (source IN ('SEED','MANUAL','RFQ')),
    updated_at       TEXT NOT NULL,
    UNIQUE (supplier_id, standard_spec_id)
  );
  CREATE INDEX supplier_prices_spec ON supplier_prices(standard_spec_id);

  CREATE TABLE boms (
    id               TEXT PRIMARY KEY,
    bom_code         TEXT NOT NULL UNIQUE,
    title            TEXT NOT NULL,
    customer_name    TEXT,
    vehicle_platform TEXT,
    annual_volume    INTEGER NOT NULL DEFAULT 0 CHECK (annual_volume >= 0),
    status           TEXT NOT NULL CHECK (status IN ('PROCESSING','ANALYZED','FAILED')),
    error_message    TEXT,
    source_filename  TEXT,
    source_mime      TEXT,
    source_file      BLOB,
    created_at       TEXT NOT NULL,
    updated_at       TEXT NOT NULL
  );

  CREATE TABLE bom_items (
    id                 TEXT PRIMARY KEY,
    bom_id             TEXT NOT NULL REFERENCES boms(id) ON DELETE CASCADE,
    line_number        INTEGER NOT NULL,
    part_number        TEXT,
    part_name          TEXT,
    category           TEXT,
    original_spec      TEXT,
    material           TEXT,
    canonical_spec_key TEXT,
    quantity           REAL NOT NULL DEFAULT 1 CHECK (quantity >= 0),
    current_unit_cost  REAL CHECK (current_unit_cost IS NULL OR current_unit_cost >= 0),
    current_supplier   TEXT,
    match_status       TEXT NOT NULL DEFAULT 'NEEDS_REVIEW' CHECK (match_status IN ('MATCHED','NEEDS_REVIEW')),
    from_spec_id       TEXT REFERENCES standard_specs(id) ON DELETE SET NULL,
    to_spec_id         TEXT REFERENCES standard_specs(id) ON DELETE SET NULL,
    equivalence        TEXT CHECK (equivalence IS NULL OR equivalence IN ('EQUIVALENT','NEAR')),
    created_at         TEXT NOT NULL,
    updated_at         TEXT NOT NULL
  );
  CREATE INDEX bom_items_bom ON bom_items(bom_id, line_number);

  CREATE TABLE part_alternatives (
    id                   TEXT PRIMARY KEY,
    bom_item_id          TEXT NOT NULL REFERENCES bom_items(id) ON DELETE CASCADE,
    standard_spec_id     TEXT REFERENCES standard_specs(id) ON DELETE SET NULL,
    supplier_id          TEXT REFERENCES suppliers(id) ON DELETE SET NULL,
    indian_standard_code TEXT NOT NULL,
    unit_cost            REAL CHECK (unit_cost IS NULL OR unit_cost >= 0),
    lead_time_days       INTEGER,
    rank_order           INTEGER NOT NULL DEFAULT 1,
    status               TEXT NOT NULL DEFAULT 'SUGGESTED' CHECK (status IN ('SUGGESTED','ACCEPTED','REJECTED')),
    customer_status      TEXT NOT NULL DEFAULT 'NOT_SUBMITTED'
                         CHECK (customer_status IN ('NOT_SUBMITTED','SUBMITTED','APPROVED','REJECTED')),
    customer_ref         TEXT,
    customer_notes       TEXT,
    decided_at           TEXT,
    customer_updated_at  TEXT,
    created_at           TEXT NOT NULL,
    updated_at           TEXT NOT NULL
  );
  CREATE INDEX part_alternatives_item ON part_alternatives(bom_item_id, rank_order);
  CREATE UNIQUE INDEX part_alternatives_one_accepted ON part_alternatives(bom_item_id) WHERE status = 'ACCEPTED';

  CREATE TABLE rfqs (
    id                    TEXT PRIMARY KEY,
    rfq_code              TEXT NOT NULL UNIQUE,
    bom_id                TEXT REFERENCES boms(id) ON DELETE SET NULL,
    bom_item_id           TEXT REFERENCES bom_items(id) ON DELETE SET NULL,
    supplier_id           TEXT REFERENCES suppliers(id) ON DELETE SET NULL,
    standard_spec_id      TEXT REFERENCES standard_specs(id) ON DELETE SET NULL,
    spec_code             TEXT NOT NULL,
    part_label            TEXT,
    supplier_name         TEXT NOT NULL,
    supplier_email        TEXT,
    annual_quantity       REAL,
    target_unit_cost      REAL,
    subject               TEXT NOT NULL,
    body                  TEXT NOT NULL,
    status                TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','SENT','QUOTED','CLOSED')),
    sent_at               TEXT,
    quoted_unit_cost      REAL CHECK (quoted_unit_cost IS NULL OR quoted_unit_cost >= 0),
    quoted_lead_time_days INTEGER,
    quote_valid_until     TEXT,
    quote_notes           TEXT,
    created_at            TEXT NOT NULL,
    updated_at            TEXT NOT NULL
  );
  CREATE INDEX rfqs_status ON rfqs(status, created_at);

  CREATE TABLE audit_events (
    id          TEXT PRIMARY KEY,
    bom_id      TEXT REFERENCES boms(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL,
    entity_id   TEXT,
    action      TEXT NOT NULL,
    summary     TEXT NOT NULL,
    created_at  TEXT NOT NULL
  );
  CREATE INDEX audit_events_bom ON audit_events(bom_id, created_at);
  `,
]
