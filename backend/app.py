import os
import json
import time
import random
import sqlite3
import threading
from datetime import datetime
from flask import Flask, request, jsonify, Response
from flask_cors import CORS
from twilio.rest import Client
from twilio.twiml.messaging_response import MessagingResponse

app = Flask(__name__)
CORS(app, origins="*")

TWILIO_ACCOUNT_SID = os.environ.get("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN")
TWILIO_PHONE_NUMBER = os.environ.get("TWILIO_PHONE_NUMBER")
TWILIO_MESSAGING_SERVICE_SID = os.environ.get("TWILIO_MESSAGING_SERVICE_SID")

twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

DB_DIR = "/data" if os.path.isdir("/data") else os.path.dirname(__file__)
DB_PATH = os.path.join(DB_DIR, "database.db")

blast_state = {
    "running": False,
    "sent": 0,
    "failed": 0,
    "total": 0,
    "events": [],
    "stop_requested": False,
}
blast_lock = threading.Lock()


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def init_db():
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS templates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            body TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS replies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            from_number TEXT NOT NULL,
            body TEXT NOT NULL,
            contacted INTEGER DEFAULT 0,
            received_at TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS optouts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            phone TEXT NOT NULL UNIQUE,
            reason TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS lists (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            columns TEXT NOT NULL,
            data TEXT NOT NULL,
            row_count INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );
    """)
    conn.close()


init_db()


# ── Health Check ──
@app.route("/")
def health():
    return jsonify({"status": "ok"})


# ── Templates CRUD ──
@app.route("/templates", methods=["GET"])
def list_templates():
    conn = get_db()
    rows = conn.execute("SELECT * FROM templates ORDER BY created_at DESC").fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.route("/templates", methods=["POST"])
def create_template():
    data = request.json
    conn = get_db()
    cur = conn.execute(
        "INSERT INTO templates (name, body) VALUES (?, ?)",
        (data["name"], data["body"]),
    )
    conn.commit()
    template = conn.execute("SELECT * FROM templates WHERE id = ?", (cur.lastrowid,)).fetchone()
    conn.close()
    return jsonify(dict(template)), 201


@app.route("/templates/<int:tid>", methods=["PUT"])
def update_template(tid):
    data = request.json
    conn = get_db()
    conn.execute(
        "UPDATE templates SET name = ?, body = ?, updated_at = datetime('now') WHERE id = ?",
        (data["name"], data["body"], tid),
    )
    conn.commit()
    template = conn.execute("SELECT * FROM templates WHERE id = ?", (tid,)).fetchone()
    conn.close()
    return jsonify(dict(template))


@app.route("/templates/<int:tid>", methods=["DELETE"])
def delete_template(tid):
    conn = get_db()
    conn.execute("DELETE FROM templates WHERE id = ?", (tid,))
    conn.commit()
    conn.close()
    return jsonify({"deleted": True})


# ── Lists CRUD ──
@app.route("/lists", methods=["GET"])
def list_lists():
    conn = get_db()
    rows = conn.execute("SELECT id, name, columns, row_count, created_at, updated_at FROM lists ORDER BY created_at DESC").fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.route("/lists/<int:lid>", methods=["GET"])
def get_list(lid):
    conn = get_db()
    row = conn.execute("SELECT * FROM lists WHERE id = ?", (lid,)).fetchone()
    conn.close()
    if not row:
        return jsonify({"error": "Not found"}), 404
    result = dict(row)
    result["columns"] = json.loads(result["columns"])
    result["data"] = json.loads(result["data"])
    return jsonify(result)


@app.route("/lists", methods=["POST"])
def create_list():
    data = request.json
    columns_json = json.dumps(data["columns"])
    data_json = json.dumps(data["data"])
    row_count = len(data["data"])
    conn = get_db()
    cur = conn.execute(
        "INSERT INTO lists (name, columns, data, row_count) VALUES (?, ?, ?, ?)",
        (data["name"], columns_json, data_json, row_count),
    )
    conn.commit()
    lst = conn.execute("SELECT id, name, columns, row_count, created_at, updated_at FROM lists WHERE id = ?", (cur.lastrowid,)).fetchone()
    conn.close()
    return jsonify(dict(lst)), 201


@app.route("/lists/<int:lid>", methods=["PUT"])
def update_list(lid):
    data = request.json
    columns_json = json.dumps(data["columns"])
    data_json = json.dumps(data["data"])
    row_count = len(data["data"])
    conn = get_db()
    conn.execute(
        "UPDATE lists SET name = ?, columns = ?, data = ?, row_count = ?, updated_at = datetime('now') WHERE id = ?",
        (data["name"], columns_json, data_json, row_count, lid),
    )
    conn.commit()
    lst = conn.execute("SELECT id, name, columns, row_count, created_at, updated_at FROM lists WHERE id = ?", (lid,)).fetchone()
    conn.close()
    return jsonify(dict(lst))


@app.route("/lists/<int:lid>", methods=["DELETE"])
def delete_list(lid):
    conn = get_db()
    conn.execute("DELETE FROM lists WHERE id = ?", (lid,))
    conn.commit()
    conn.close()
    return jsonify({"deleted": True})


# ── Blast ──
def send_blast(contacts, template_body, field_mapping):
    """Background thread that sends SMS one by one."""
    conn = get_db()
    optouts = {r["phone"] for r in conn.execute("SELECT phone FROM optouts").fetchall()}
    conn.close()

    with blast_lock:
        blast_state["running"] = True
        blast_state["sent"] = 0
        blast_state["failed"] = 0
        blast_state["total"] = len(contacts)
        blast_state["events"] = []
        blast_state["stop_requested"] = False

    for i, contact in enumerate(contacts):
        with blast_lock:
            if blast_state["stop_requested"]:
                blast_state["running"] = False
                blast_state["events"].append({
                    "type": "stopped",
                    "index": i,
                    "timestamp": datetime.utcnow().isoformat(),
                })
                return

        # Build personalized message
        message = template_body
        for field, csv_col in field_mapping.items():
            message = message.replace("{{" + field + "}}", str(contact.get(csv_col, "")))

        phone = contact.get(field_mapping.get("_phone_column", "Phone"), "")
        if not phone:
            # Try to find a phone-like column
            for key in contact:
                val = str(contact[key])
                if val.startswith("+") or (val.replace("-", "").replace("(", "").replace(")", "").replace(" ", "").isdigit() and len(val) > 7):
                    phone = val
                    break

        if phone in optouts:
            with blast_lock:
                blast_state["failed"] += 1
                blast_state["events"].append({
                    "type": "skipped",
                    "phone": phone,
                    "reason": "opted out",
                    "index": i,
                    "timestamp": datetime.utcnow().isoformat(),
                })
            continue

        try:
            send_kwargs = {"body": message, "to": phone}
            if TWILIO_MESSAGING_SERVICE_SID:
                send_kwargs["messaging_service_sid"] = TWILIO_MESSAGING_SERVICE_SID
            else:
                send_kwargs["from_"] = TWILIO_PHONE_NUMBER
            twilio_client.messages.create(**send_kwargs)
            with blast_lock:
                blast_state["sent"] += 1
                blast_state["events"].append({
                    "type": "sent",
                    "phone": phone,
                    "message": message[:80],
                    "index": i,
                    "timestamp": datetime.utcnow().isoformat(),
                })
        except Exception as e:
            with blast_lock:
                blast_state["failed"] += 1
                blast_state["events"].append({
                    "type": "failed",
                    "phone": phone,
                    "error": str(e)[:120],
                    "index": i,
                    "timestamp": datetime.utcnow().isoformat(),
                })

        delay = random.uniform(1.2, 2.5)
        time.sleep(delay)

    with blast_lock:
        blast_state["running"] = False
        blast_state["events"].append({
            "type": "complete",
            "timestamp": datetime.utcnow().isoformat(),
        })


@app.route("/blast", methods=["POST"])
def start_blast():
    data = request.json
    contacts = data.get("contacts", [])
    template_body = data.get("template_body", "")
    field_mapping = data.get("field_mapping", {})

    if not contacts or not template_body:
        return jsonify({"error": "contacts and template_body required"}), 400

    with blast_lock:
        if blast_state["running"]:
            return jsonify({"error": "Blast already in progress"}), 409

    t = threading.Thread(target=send_blast, args=(contacts, template_body, field_mapping))
    t.daemon = True
    t.start()

    return jsonify({"message": "Blast started", "total": len(contacts)})


@app.route("/blast-stop", methods=["POST"])
def stop_blast():
    with blast_lock:
        blast_state["stop_requested"] = True
    return jsonify({"message": "Stop requested"})


@app.route("/blast-status")
def blast_status():
    def generate():
        last_index = 0
        sent_final = False
        while True:
            with blast_lock:
                events = blast_state["events"][last_index:]
                last_index = len(blast_state["events"])
                state = {
                    "running": blast_state["running"],
                    "sent": blast_state["sent"],
                    "failed": blast_state["failed"],
                    "total": blast_state["total"],
                    "events": events,
                }
            yield f"data: {json.dumps(state)}\n\n"
            # Check if blast has finished
            if not state["running"] and state["total"] > 0:
                if sent_final:
                    break
                # Send one more tick so the client gets the final state
                sent_final = True
            time.sleep(0.5)

    return Response(generate(), mimetype="text/event-stream", headers={
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
        "Access-Control-Allow-Origin": "*",
    })


# ── Twilio Inbound Webhook ──
OPT_OUT_KEYWORDS = {"stop", "unsubscribe", "quit", "cancel"}


@app.route("/sms", methods=["POST"])
def inbound_sms():
    from_number = request.form.get("From", "")
    body = request.form.get("Body", "")
    conn = get_db()

    # Check opt-out
    if body.strip().lower() in OPT_OUT_KEYWORDS:
        try:
            conn.execute(
                "INSERT OR IGNORE INTO optouts (phone, reason) VALUES (?, ?)",
                (from_number, body.strip()),
            )
            conn.commit()
        except Exception:
            pass
        resp = MessagingResponse()
        resp.message("You have been unsubscribed. You will not receive further messages.")
        conn.close()
        return str(resp), 200, {"Content-Type": "application/xml"}

    # Save reply
    conn.execute(
        "INSERT INTO replies (from_number, body) VALUES (?, ?)",
        (from_number, body),
    )
    conn.commit()
    conn.close()

    resp = MessagingResponse()
    return str(resp), 200, {"Content-Type": "application/xml"}


# ── Replies ──
@app.route("/replies")
def list_replies():
    conn = get_db()
    rows = conn.execute("SELECT * FROM replies ORDER BY received_at DESC").fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.route("/replies/<int:rid>/contacted", methods=["PUT"])
def mark_contacted(rid):
    conn = get_db()
    conn.execute("UPDATE replies SET contacted = 1 WHERE id = ?", (rid,))
    conn.commit()
    conn.close()
    return jsonify({"updated": True})


# ── Opt-Outs ──
@app.route("/optouts")
def list_optouts():
    conn = get_db()
    rows = conn.execute("SELECT * FROM optouts ORDER BY created_at DESC").fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))
