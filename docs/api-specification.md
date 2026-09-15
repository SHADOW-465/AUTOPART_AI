# Enterprise API Specification — SEION AutoPart AI

---

## 1. Overview & Authentication Standards

The SEION AutoPart AI Enterprise API enables seamless integration between external ERP systems (SAP S/4HANA, TallyPrime, Microsoft Dynamics 365, Zoho Books), PLM suites (Siemens Teamcenter, PTC Windchill), and the SEION Sourcing Engine.

- **Base URL**: `https://api.seion.ai/v1`
- **Protocol**: HTTPS (TLS 1.3 mandatory)
- **Data Format**: `application/json`
- **Authentication**: Bearer JWT tokens for interactive users; API Key (`X-API-Key`) + HMAC Secret for machine-to-machine ERP connectors.
- **Tenant Context**: All requests require the `X-Tenant-ID` header (or resolved automatically via the API Key).

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
X-Tenant-ID: 7a93f120-410e-4b28-b80c-7b2c5950a41d
Content-Type: application/json
```

---

## 2. API Endpoints Catalog

```mermaid
graph TD
    Client[Enterprise Client / ERP] --> Auth{Auth Check}
    Auth -->|POST /boms/upload| Ingest[Async Ingestion Service]
    Auth -->|GET /boms/:id/alternatives| Match[Alternative Matching Service]
    Auth -->|POST /validations/metallurgy| Gemini[Gemini Metallurgical AI]
    Auth -->|POST /rfqs/dispatch| RFQ[RFQ Dispatch Service]
    Auth -->|POST /erp/sync| ERP[ERP Bi-directional Sync]
```

---

### A. Ingestion & BOM Management

#### `POST /boms/upload`
Uploads a raw Bill of Materials file (PDF, Excel `.xlsx`, CSV, or 3D CAD `.step`) for asynchronous extraction and analysis.

**Request (`multipart/form-data`)**:
```http
POST /api/v1/boms/upload HTTP/1.1
Host: api.seion.ai
Authorization: Bearer <token>
Content-Type: multipart/form-data; boundary=---Boundary12345

---Boundary12345
Content-Disposition: form-data; name="file"; filename="Engine_Mount_Assembly_BOM.pdf"
Content-Type: application/pdf

<Binary PDF Data>
---Boundary12345
Content-Disposition: form-data; name="vehicle_platform"

X101-EV-Powertrain
---Boundary12345
Content-Disposition: form-data; name="target_savings_threshold"

20
---Boundary12345--
```

**Response (`202 Accepted`)**:
```json
{
  "status": "ACCEPTED",
  "bom_id": "9f829c6d-3dc0-449e-8c31-92b6a22f3607",
  "filename": "Engine_Mount_Assembly_BOM.pdf",
  "file_size_bytes": 4194304,
  "detected_format": "PDF_DRAWING_WITH_TABLE",
  "processing_status": "PROCESSING",
  "estimated_completion_seconds": 15,
  "poll_url": "/api/v1/boms/9f829c6d-3dc0-449e-8c31-92b6a22f3607/status",
  "websocket_channel": "wss://api.seion.ai/v1/ws/boms/9f829c6d-3dc0-449e-8c31-92b6a22f3607"
}
```

---

#### `GET /boms/{bom_id}`
Fetches the full extracted BOM, categorized line items, and aggregate cost optimization metrics.

**Response (`200 OK`)**:
```json
{
  "bom_id": "9f829c6d-3dc0-449e-8c31-92b6a22f3607",
  "code": "BOM-2026-094",
  "title": "Engine Mount Assembly v3",
  "status": "ANALYZED",
  "summary": {
    "total_parts_count": 42,
    "foreign_spec_parts_count": 28,
    "high_confidence_alternatives_found": 26,
    "original_total_cost_inr": 485000.00,
    "optimized_total_cost_inr": 329800.00,
    "potential_net_savings_inr": 155200.00,
    "savings_percentage": 32.0
  },
  "items": [
    {
      "item_id": "1e7c5b10-74a8-45a8-9d8f-b98a723820fa",
      "part_name": "Hex Socket Head Cap Screw",
      "original_spec": "DIN 912 M6x20 8.8",
      "quantity": 2500,
      "original_unit_cost_inr": 12.50,
      "category": "Fasteners",
      "alternatives_count": 3,
      "top_alternative": {
        "alternative_id": "alt-4412",
        "spec": "IS 1367 (Part 3) M6x20 8.8",
        "standard_code": "IS 1367",
        "vendor_name": "ChennaiFasteners Ltd",
        "vendor_hub": "Chennai",
        "unit_cost_inr": 8.20,
        "savings_pct": 34.4,
        "is_ais_compliant": true,
        "lead_time_days": 3
      }
    }
  ]
}
```

---

### B. Engineering & Metallurgical AI Validation

#### `POST /validations/metallurgy`
Triggers an automated, deep metallurgical and mechanical parity validation between a foreign standard component and a proposed Indian Standard equivalent using Gemini 2.0 Flash.

**Request Body**:
```json
{
  "original_part": {
    "name": "Hex Socket Bolt",
    "specification": "DIN 912 M6x20 Grade 8.8",
    "material_grade": "Medium Carbon Steel Quenched & Tempered"
  },
  "proposed_alternative": {
    "specification": "IS 1367 (Part 3) M6x20 Grade 8.8",
    "standard": "IS 1367",
    "supplier_id": "sup-chennai-01"
  },
  "operating_environment": {
    "temperature_range_celsius": "-20 to 120",
    "application_type": "Engine Bracket Underbody Mounting",
    "salt_spray_requirement_hours": 720
  }
}
```

**Response (`200 OK`)**:
```json
{
  "validation_id": "val-88319",
  "timestamp": "2026-09-12T11:45:00Z",
  "ai_model": "gemini-2.0-flash",
  "verdict": "SAFE_TO_SWITCH",
  "confidence_score": 99.2,
  "technical_audit": {
    "chemical_composition": {
      "status": "EQUIVALENT",
      "original_range": "C: 0.25-0.40%, Mn: 0.60-0.90%, P max: 0.025%, S max: 0.025%",
      "alternative_range": "C: 0.25-0.40%, Mn: 0.60-0.90%, P max: 0.025%, S max: 0.025%",
      "delta_analysis": "Exact carbon equivalent and quenching profile match."
    },
    "mechanical_properties": {
      "tensile_strength_mpa": { "original": 800, "alternative": 800, "parity": true },
      "yield_strength_mpa": { "original": 640, "alternative": 640, "parity": true },
      "elongation_pct": { "original": 12, "alternative": 12, "parity": true },
      "hardness_range": { "original": "22-32 HRC", "alternative": "22-32 HRC", "parity": true }
    },
    "dimensional_tolerances": {
      "thread_pitch": "M6 x 1.0 (ISO Metric)",
      "fit_class": "6g (Interchangeable)"
    },
    "coating_and_compliance": {
      "coating_recommendation": "Zinc Flake (ISO 10683 / IS 16647) required to meet 720h NSS requirement",
      "ais_compliance_status": "Meets AIS-071 automotive hardware mandate",
      "bis_certification_required": true
    }
  },
  "full_report_markdown": "**TECHNICAL VALIDATION REPORT**\n\n- Material: Grade 8.8 medium carbon steel..."
}
```

---

### C. Procurement & RFQ Dispatch

#### `POST /rfqs/dispatch`
Generates formal RFQ packages and dispatches them via SMTP and WhatsApp Business API to verified domestic suppliers.

**Request Body**:
```json
{
  "bom_id": "9f829c6d-3dc0-449e-8c31-92b6a22f3607",
  "selected_items": [
    {
      "bom_item_id": "1e7c5b10-74a8-45a8-9d8f-b98a723820fa",
      "chosen_alternative_spec": "IS 1367 M6x20 8.8",
      "annual_forecast_quantity": 30000,
      "batch_delivery_quantity": 2500,
      "target_unit_cost_inr": 8.20
    }
  ],
  "target_suppliers": ["sup-chennai-01", "sup-pune-04"],
  "delivery_location": "Chennai Plant, SIPCOT Industrial Park, Oragadam",
  "required_lead_time_days": 14,
  "compliance_documents_requested": [
    "BIS_LICENSE_CERTIFICATE",
    "MILL_TEST_CERTIFICATE_MTR",
    "SALT_SPRAY_TEST_REPORT_720H",
    "PPAP_LEVEL_3"
  ]
}
```

**Response (`201 Created`)**:
```json
{
  "rfq_batch_id": "rfq-batch-2026-0042",
  "dispatched_at": "2026-09-12T11:46:12Z",
  "dispatched_count": 2,
  "suppliers_contacted": [
    {
      "supplier_id": "sup-chennai-01",
      "supplier_name": "ChennaiFasteners Ltd",
      "dispatch_channels": ["EMAIL", "WHATSAPP_PORTAL"],
      "tracking_token": "rfq_trk_991823"
    }
  ],
  "vendor_portal_link": "https://suppliers.seion.ai/quote/rfq-batch-2026-0042"
}
```

---

## 3. Webhook Events Catalog

Enterprise clients and ERP listeners subscribe to webhook events to automate downstream workflows:

| Event Name | Trigger Condition | Payload Summary |
| :--- | :--- | :--- |
| `bom.extraction.completed` | Asynchronous file parsing and spec identification is finished. | `bom_id`, `parts_count`, `extraction_duration_ms` |
| `bom.alternatives.matched` | Alternative sourcing algorithms have completed ranking. | `bom_id`, `total_savings_inr`, `savings_pct` |
| `rfq.quote.received` | A domestic supplier has submitted unit pricing and lead times. | `rfq_id`, `supplier_id`, `quoted_unit_cost`, `lead_time_days` |
| `validation.verdict.ready` | AI metallurgical validation completes analysis. | `validation_id`, `verdict`, `confidence_score` |

### Webhook Security Signature
All webhook payloads include an HMAC-SHA256 signature in the header:
```http
X-Seion-Signature: sha256=52f92f70711cbe674eb00890f68e3d36592e502bb07675f10200560b033a1418
```
Verification example (Node.js):
```javascript
const crypto = require('crypto');
const signature = req.headers['x-seion-signature'];
const expected = 'sha256=' + crypto.createHmac('sha256', process.env.SEION_WEBHOOK_SECRET).update(rawBody).digest('hex');
if (signature !== expected) throw new Error('Invalid webhook signature');
```
