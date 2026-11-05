// Sample BOMs are embedded as modules (not read from public/) so they are bundled with
// the server code on serverless hosts and served by app/samples/[file]/route.ts.

/** 13-line underbody kit: exact, near and description matches, a coating warning, a line with no
 * supplier price, and two lines with no IS equivalent. */
export const SAMPLE_BOM_CSV = `Part No,Description,Specification,Qty/Veh,Unit Price (INR),Vendor,Commodity
FA-1001,Hex socket head cap screw,DIN 912 M6x20 8.8,8,5.80,Import - Germany,Fasteners
FA-1002,Hex head screw underbody,DIN EN ISO 4017 M8x25 8.8 zinc flake ISO 10683,12,4.10,Import - China,Fasteners
FA-1003,Hex head bolt,DIN 931 M10x60 8.8,4,7.20,Import - Germany,Fasteners
FA-1004,Hex nut,ISO 4032 M8 8,16,1.60,Import - China,Fasteners
FA-1005,Plain washer,DIN 125 A 8.4,16,0.62,Import - China,Fasteners
FA-1006,Spring lock washer,DIN 127 B8,12,0.45,Import - China,Fasteners
FA-1007,Countersunk socket screw,DIN 7991 M6x16 10.9,6,6.90,Import - Germany,Fasteners
FA-1008,Threaded stud,DIN 976 M10x120 8.8,2,16.50,Import - Germany,Fasteners
ST-2001,Floor panel blank,EN 10130 FeP04 1.0 mm,1,82.00,Import - Korea,Sheet metal
ST-2002,Gear blank 16MnCr5,,2,135.00,Import - Germany,Forgings
ST-2003,Mounting bracket,S235JR 6 mm plate,2,64.00,Local,Sheet metal
RB-3001,Coolant hose,EPDM hose 19 mm ID,1,240.00,Import - Thailand,Rubber
MS-4001,Wiring clip,Customer drawing 7741-22,10,2.10,Import - China,Plastics
`

/** 7-line brake kit used by the demo data: a grade above the IS record, material grades in the
 * description, a spec-only spring and an unmatched rubber part. */
export const DEMO_BRAKE_BOM_CSV = `Part No,Description,Specification,Qty/Veh,Unit Price (INR),Vendor,Commodity
BC-5001,Caliper mounting bolt,ISO 4017 M10x30 10.9,4,9.80,Import - Germany,Fasteners
BC-5002,Caliper guide pin bolt,DIN 912 M8x25 8.8,4,6.40,Import - Germany,Fasteners
BC-5003,Hex nut,DIN 934 M10 8,4,2.10,Import - China,Fasteners
BC-5004,Plain washer,ISO 7089 10,8,0.85,Import - China,Fasteners
BC-5005,Bracket forging 42CrMo4,,1,410.00,Import - Germany,Forgings
BC-5006,Return spring 55Cr3,,2,38.00,Import - Japan,Springs
BC-5007,Dust boot,EPDM boot per drawing 55-102,2,46.00,Import - Thailand,Rubber
`

export const BOM_TEMPLATE_CSV = `Part No,Description,Specification,Qty/Veh,Unit Price (INR),Vendor,Commodity
FA-0001,Hex head screw,ISO 4017 M8x25 8.8,4,3.80,Current supplier name,Fasteners
`

export const SAMPLE_FILES: Record<string, string> = {
  "sample-bom.csv": SAMPLE_BOM_CSV,
  "demo-brake-kit.csv": DEMO_BRAKE_BOM_CSV,
  "bom-template.csv": BOM_TEMPLATE_CSV,
}
