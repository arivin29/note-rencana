#!/usr/bin/env python3
"""
Generate and push a comprehensive PDAM simulation diagram — SCADA STYLE.

Uses schematic renderMode for equipment nodes (P&ID symbols, no card boxes).
Thick 3D pipes with flow animation. Subtle labels. Professional look.

Layout: Left-to-right water flow
  Sumber Air → Pompa Intake → Flowmeter → WTP/IPA → Reservoir → Pompa Distribusi → Junction
  Junction branches → 3 distribution zones each with valve + pressure sensor

Sensors: 6 pressure channels bound to P1-P6
Value Displays: 6 compact cards showing realtime pressure
Text Labels: Title, subtitle, area labels
"""

import json
import uuid
import subprocess
import sys
import os

TOKEN = os.environ.get("TOKEN")
if not TOKEN:
    print("ERROR: TOKEN env var not set")
    sys.exit(1)

DIAGRAM_ID = "04175eb7-a447-4289-b2e2-2815fe1cad74"
PROJECT_ID = "1414bdba-000b-4e17-b877-557136f8ef2a"
BASE_URL = "http://localhost:3000/api/scada/diagrams"

# Sensor channel IDs (all tekanan/bar)
CH1 = "5e04acf2-81c0-4f1f-b0c3-d4802ac0242f"  # HELIO-350544503213269
CH2 = "4c259dff-564a-4dea-a8d4-e6e13dc86330"  # HELIO-353691843830935
CH3 = "4207ba5b-246c-4ccf-ad66-a6c57e6059c6"  # HELIO-353691843831016
CH4 = "4b78816e-8d9a-4add-a2d5-d2d3f9aff4d7"  # HELIO-357073298204872
CH5 = "5133b1bd-dec6-4821-bedb-fcbc8c28c8bf"  # HELIO-357073298536240
CH6 = "1e55583d-eb94-4962-8596-cd0e9522fa8d"  # HELIO-357073299572905

def uid():
    return str(uuid.uuid4())

# ── Pre-generate all node IDs ──────────────────────────────────
nid = {}
node_keys = [
    # Titles
    "title", "subtitle",
    # Main pipeline equipment
    "intake", "pump_intake", "flowmeter1", "wtp", "reservoir", "pump_dist",
    "junction_main",
    # Distribution branches
    "valve_a", "valve_b", "valve_c",
    # Pressure sensors
    "p1", "p2", "p3", "p4", "p5", "p6",
    # Value displays
    "vd1", "vd2", "vd3", "vd4", "vd5", "vd6",
    # Area labels
    "lbl_source", "lbl_treatment", "lbl_storage", "lbl_dist",
    "lbl_area1", "lbl_area2", "lbl_area3",
]
for k in node_keys:
    nid[k] = uid()

# ── Helpers ────────────────────────────────────────────────────
nodes = []
edges = []

def add_node(key, ntype, label, x, y, w, h, style=None, config=None, bindings=None):
    nodes.append({
        "id": nid[key],
        "type": ntype,
        "label": label,
        "position": {"x": x, "y": y},
        "size": {"width": w, "height": h},
        "rotationDeg": 0,
        "zIndex": 0,
        "relatedNodeId": None,
        "relatedSensorId": None,
        "style": style or {},
        "config": config or {},
        "bindings": bindings or [],
    })

def pressure_binding(channel_id):
    return [{
        "bindingKey": "tekanan",
        "sensorChannelId": channel_id,
        "displayLabel": "tekanan",
        "unitOverride": "bar",
        "transform": None,
        "priorityOrder": 0,
        "isPrimary": True,
    }]

def add_edge(src_key, tgt_key, pipe_type="raw", flow="forward",
             src_h="r", tgt_h="l", label=None, animated=False, stroke=5):
    edges.append({
        "id": uid(),
        "source": nid[src_key],
        "target": nid[tgt_key],
        "edgeType": "pipe",
        "label": label,
        "pipeType": pipe_type,
        "flowDirection": flow,
        "animated": animated,
        "style": {},
        "config": {
            "sourceHandle": src_h,
            "targetHandle": tgt_h,
            "pathMode": "step",
            "strokeWidth": stroke,
        },
    })

# ═══════════════════════════════════════════════════════════════
#  NODES — SCHEMATIC STYLE (renderMode: schematic)
# ═══════════════════════════════════════════════════════════════

# ── Base style for schematic equipment nodes ───────────────────
def equip_style(color, label_fs=11):
    return {
        "renderMode": "schematic",
        "accentColor": color,
        "labelFontSize": label_fs,
        "valueFontSize": 14,
    }

# ── Title ──────────────────────────────────────────────────────
add_node("title", "text_label", "SCADA PDAM TEBO", 520, 15, 300, 45,
    style={"fontSize": 24, "fontWeight": "bold", "fontColor": "#e2e8f0",
           "textAlign": "center", "showBg": False})

add_node("subtitle", "text_label", "Sistem Monitoring Tekanan Distribusi Air Minum", 480, 55, 380, 30,
    style={"fontSize": 12, "fontColor": "#94a3b8", "textAlign": "center", "showBg": False})

# ── Main Pipeline Equipment (y ~ 200 center line) ─────────────
add_node("intake", "intake", "Sumber Air Baku", 50, 150, 120, 120,
    style=equip_style("#0ea5e9", 11))

add_node("pump_intake", "pump", "Pompa Intake", 290, 160, 110, 110,
    style=equip_style("#22c55e", 10))

add_node("flowmeter1", "flowmeter", "Flowmeter", 500, 170, 90, 90,
    style=equip_style("#a855f7", 10))

add_node("wtp", "wtp", "IPA / WTP", 680, 135, 150, 150,
    style=equip_style("#06b6d4", 12))

add_node("reservoir", "reservoir", "Reservoir Utama", 940, 135, 140, 140,
    style=equip_style("#3b82f6", 11))

add_node("pump_dist", "pump", "Pompa Distribusi", 1180, 160, 110, 110,
    style=equip_style("#f59e0b", 10))

add_node("junction_main", "junction", "Cabang Utama", 1380, 185, 70, 70,
    style=equip_style("#6366f1", 9))

# ── Section Labels ─────────────────────────────────────────────
add_node("lbl_source", "text_label", "SUMBER AIR", 65, 130, 100, 18,
    style={"fontSize": 9, "fontWeight": "bold", "fontColor": "#0ea5e9",
           "textAlign": "center", "showBg": False})

add_node("lbl_treatment", "text_label", "PENGOLAHAN AIR", 700, 118, 120, 18,
    style={"fontSize": 9, "fontWeight": "bold", "fontColor": "#06b6d4",
           "textAlign": "center", "showBg": False})

add_node("lbl_storage", "text_label", "PENAMPUNGAN", 960, 118, 110, 18,
    style={"fontSize": 9, "fontWeight": "bold", "fontColor": "#3b82f6",
           "textAlign": "center", "showBg": False})

add_node("lbl_dist", "text_label", "DISTRIBUSI", 1360, 118, 100, 18,
    style={"fontSize": 9, "fontWeight": "bold", "fontColor": "#6366f1",
           "textAlign": "center", "showBg": False})

# ── Pressure Sensors — schematic style ─────────────────────────
def pressure_style(color):
    return {
        "renderMode": "schematic",
        "accentColor": color,
        "labelFontSize": 9,
        "valueFontSize": 15,
    }

add_node("p1", "pressure", "P1 - Tekanan Intake", 60, 340, 110, 110,
    style=pressure_style("#0ea5e9"),
    bindings=pressure_binding(CH1))

add_node("p2", "pressure", "P2 - Pra Pengolahan", 510, 340, 110, 110,
    style=pressure_style("#a855f7"),
    bindings=pressure_binding(CH2))

add_node("p3", "pressure", "P3 - Pasca Pengolahan", 790, 340, 120, 110,
    style=pressure_style("#06b6d4"),
    bindings=pressure_binding(CH3))

# ── Distribution Branch A: Zona Kota ──────────────────────────
add_node("valve_a", "valve", "Valve Zona Kota", 1500, 120, 90, 90,
    style=equip_style("#f97316", 9))

add_node("p4", "pressure", "P4 - Zona Kota", 1660, 115, 100, 100,
    style=pressure_style("#f97316"),
    bindings=pressure_binding(CH4))

add_node("lbl_area1", "text_label", "ZONA KOTA", 1665, 98, 90, 16,
    style={"fontSize": 8, "fontWeight": "bold", "fontColor": "#f97316",
           "showBg": False, "textAlign": "center"})

# ── Distribution Branch B: Zona Industri ──────────────────────
add_node("valve_b", "valve", "Valve Zona Industri", 1500, 280, 90, 90,
    style=equip_style("#eab308", 9))

add_node("p5", "pressure", "P5 - Zona Industri", 1660, 275, 100, 100,
    style=pressure_style("#eab308"),
    bindings=pressure_binding(CH5))

add_node("lbl_area2", "text_label", "ZONA INDUSTRI", 1660, 258, 110, 16,
    style={"fontSize": 8, "fontWeight": "bold", "fontColor": "#eab308",
           "showBg": False, "textAlign": "center"})

# ── Distribution Branch C: Zona Perumahan ─────────────────────
add_node("valve_c", "valve", "Valve Zona Perumahan", 1500, 440, 90, 90,
    style=equip_style("#10b981", 9))

add_node("p6", "pressure", "P6 - Zona Perumahan", 1660, 435, 110, 100,
    style=pressure_style("#10b981"),
    bindings=pressure_binding(CH6))

add_node("lbl_area3", "text_label", "ZONA PERUMAHAN", 1660, 418, 115, 16,
    style={"fontSize": 8, "fontWeight": "bold", "fontColor": "#10b981",
           "showBg": False, "textAlign": "center"})

# ── Value Displays (main pipeline sensors) ─────────────────────
vd_base = {
    "layout": "horizontal", "labelFontSize": 9, "valueFontSize": 14,
    "showStatusDot": True, "showStatusBorder": True,
    "bgColor": "#1e293b", "borderColor": "#334155",
}

add_node("vd1", "value_display", "Tekanan Intake", 35, 470, 170, 25,
    style={**vd_base, "valueColor": "#0ea5e9"},
    bindings=pressure_binding(CH1))

add_node("vd2", "value_display", "Tekanan Pra-IPA", 490, 470, 170, 25,
    style={**vd_base, "valueColor": "#a855f7"},
    bindings=pressure_binding(CH2))

add_node("vd3", "value_display", "Tekanan Pasca-IPA", 770, 470, 175, 25,
    style={**vd_base, "valueColor": "#06b6d4"},
    bindings=pressure_binding(CH3))

# Value displays for distribution zones
vd_small = {
    "layout": "horizontal", "labelFontSize": 8, "valueFontSize": 12,
    "showStatusDot": True, "showStatusBorder": True,
    "bgColor": "#1e293b", "borderColor": "#334155",
}

add_node("vd4", "value_display", "P4 Kota", 1650, 220, 130, 25,
    style={**vd_small, "valueColor": "#f97316"},
    bindings=pressure_binding(CH4))

add_node("vd5", "value_display", "P5 Industri", 1650, 380, 130, 25,
    style={**vd_small, "valueColor": "#eab308"},
    bindings=pressure_binding(CH5))

add_node("vd6", "value_display", "P6 Perumahan", 1650, 540, 130, 25,
    style={**vd_small, "valueColor": "#10b981"},
    bindings=pressure_binding(CH6))

# ═══════════════════════════════════════════════════════════════
#  EDGES — THICK PIPES WITH FLOW ANIMATION
# ═══════════════════════════════════════════════════════════════

# Main pipeline (thick, animated)
add_edge("intake",      "pump_intake",   "raw",     "forward", "r", "l", animated=True, stroke=6)
add_edge("pump_intake",  "flowmeter1",   "raw",     "forward", "r", "l", animated=True, stroke=6)
add_edge("flowmeter1",   "wtp",          "raw",     "forward", "r", "l", animated=True, stroke=6)
add_edge("wtp",          "reservoir",    "treated", "forward", "r", "l", animated=True, stroke=7)
add_edge("reservoir",    "pump_dist",    "treated", "forward", "r", "l", animated=True, stroke=7)
add_edge("pump_dist",    "junction_main","treated", "forward", "r", "l", animated=True, stroke=7)

# Sensor taps (thinner, no animation) — use offset handles
add_edge("intake",    "p1", "raw",     "none", "rb", "t", stroke=3)
add_edge("flowmeter1","p2", "raw",     "none", "b",  "t", stroke=3)
add_edge("wtp",       "p3", "treated", "none", "rb", "t", stroke=3)

# Distribution branches — use different handles on junction for realistic routing
add_edge("junction_main", "valve_a", "treated", "forward", "rt", "l", animated=True, stroke=5)
add_edge("junction_main", "valve_b", "treated", "forward", "r",  "l", animated=True, stroke=5)
add_edge("junction_main", "valve_c", "treated", "forward", "rb", "lt", animated=True, stroke=5)

# Valve → Pressure sensor (thinner)
add_edge("valve_a", "p4", "treated", "forward", "r", "l", stroke=4)
add_edge("valve_b", "p5", "treated", "forward", "r", "l", stroke=4)
add_edge("valve_c", "p6", "treated", "forward", "r", "l", stroke=4)

# ═══════════════════════════════════════════════════════════════
#  BUILD & SEND
# ═══════════════════════════════════════════════════════════════

payload = {
    "diagram": {
        "name": "PDAM TEBO - Monitoring Tekanan",
        "projectId": PROJECT_ID,
        "status": "draft",
        "canvasConfig": {
            "bgColor": "#0f172a",
            "gridType": "dots",
            "snapToGrid": True,
            "gridSize": 10,
        },
        "runtimeConfig": {
            "pollingIntervalMs": 5000,
        },
    },
    "nodes": nodes,
    "edges": edges,
}

print(f"Payload: {len(nodes)} nodes, {len(edges)} edges")
payload_json = json.dumps(payload)

# Write payload to temp file for debugging
with open("/tmp/pdam-diagram-payload.json", "w") as f:
    json.dump(payload, f, indent=2)
print("Payload written to /tmp/pdam-diagram-payload.json")

# PUT via curl
url = f"{BASE_URL}/{DIAGRAM_ID}"
result = subprocess.run(
    [
        "curl", "-s", "-w", "\n%{http_code}",
        "-X", "PUT",
        "-H", f"Authorization: Bearer {TOKEN}",
        "-H", "Content-Type: application/json",
        "-d", payload_json,
        url,
    ],
    capture_output=True, text=True,
)

output = result.stdout.strip()
lines = output.rsplit("\n", 1)
body = lines[0] if len(lines) > 1 else output
status = lines[1] if len(lines) > 1 else "?"

print(f"\nHTTP {status}")
if status.startswith("2"):
    resp = json.loads(body)
    print(f"✅ Diagram updated: {resp.get('diagram', {}).get('name', '?')}")
    print(f"   Nodes: {len(resp.get('nodes', []))}")
    print(f"   Edges: {len(resp.get('edges', []))}")
else:
    print(f"❌ Error: {body[:500]}")
