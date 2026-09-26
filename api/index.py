from http.server import BaseHTTPRequestHandler
from pathlib import Path
import json
import re
import sqlite3
from urllib.parse import parse_qs, urlparse
from zipfile import ZipFile

from build_index import TYPE_LABELS, case_subject, romanize


ROOT = Path(__file__).resolve().parents[1]
DB = ROOT / "data" / "karyaniti.db"
ARCHIVE = ROOT / "data" / "nkp_cases_with_rit.zip"
ROMAN_ALIASES = {
    "samandha": "sambandha",
    "samandh": "sambandha",
    "samband": "sambandha",
    "biched": "vichchheda",
    "bichhed": "vichchheda",
    "biced": "vichchheda",
}
DEVANAGARI_WORD = re.compile(r"[\u0900-\u097F]+")
QUERY_TOKEN = re.compile(r"[A-Za-z0-9_]+|[\u0900-\u097F]+")
PAGE_SIZE = 50


def official_url(case_id):
    return f"https://nkp.gov.np/full_detail/{int(case_id)}/"


def archive_name(case_type, case_id):
    return f"nkp_cases/mudda_type_{int(case_type)}/case_{int(case_id)}.txt"


def read_case(archive, case_type, case_id):
    return archive.read(archive_name(case_type, case_id)).decode("utf-8", errors="replace")


def highlight_terms(text, query):
    tokens = QUERY_TOKEN.findall(query)
    if not tokens:
        return []
    if any("a" <= char.lower() <= "z" for char in query):
        wanted = {ROMAN_ALIASES.get(token.lower(), token.lower()) for token in tokens}
        literal = {token for token in tokens if re.search(re.escape(token), text, re.IGNORECASE)}
        romanized = {word for word in DEVANAGARI_WORD.findall(text) if any(term in romanize(word).lower() for term in wanted)}
        return sorted(literal | romanized, key=len, reverse=True)
    return [token for token in tokens if token in text]


def first_match(text, query):
    tokens = QUERY_TOKEN.findall(query)
    if not tokens:
        return -1
    if any("a" <= char.lower() <= "z" for char in query):
        wanted = {ROMAN_ALIASES.get(token.lower(), token.lower()) for token in tokens}
        positions = [match.start() for match in DEVANAGARI_WORD.finditer(text) if any(term in romanize(match.group()).lower() for term in wanted)]
        positions.extend(match.start() for token in tokens if (match := re.search(re.escape(token), text, re.IGNORECASE)))
    else:
        positions = [position for token in tokens if (position := text.find(token)) >= 0]
    return min(positions) if positions else -1


def snippet_for(text, query):
    position = first_match(text, query)
    if position < 0:
        return text[:520], []
    start = max(0, position - 180)
    end = min(len(text), start + 620)
    if end - start < 620:
        start = max(0, end - 620)
    snippet = text[start:end]
    return ("…" if start else "") + snippet + ("…" if end < len(text) else ""), highlight_terms(snippet, query)


def empty_result(row):
    return {
        "id": row[0],
        "type": row[1],
        "label": row[2],
        "nirnaya_no": row[3],
        "subject": row[6],
        "subject_highlight_terms": [],
        "official_url": official_url(row[0]),
        "snippet": row[5],
        "highlight_terms": [],
    }


def search(query, case_type, page=1):
    page = max(1, page)
    offset = (page - 1) * PAGE_SIZE
    raw_tokens = QUERY_TOKEN.findall(query)
    con = sqlite3.connect(DB)
    try:
        if not raw_tokens:
            sql = "SELECT case_id, case_type, type_label, nirnaya_no, path, preview, subject, subject_roman FROM cases"
            params = []
            if case_type:
                sql += " WHERE case_type = ?"
                params.append(case_type)
            rows = con.execute(sql + " ORDER BY CAST(case_id AS INTEGER) DESC LIMIT ? OFFSET ?", params + [PAGE_SIZE + 1, offset]).fetchall()
            has_more = len(rows) > PAGE_SIZE
            return [empty_result(row) for row in rows[:PAGE_SIZE]], has_more

        romanized = any("a" <= char.lower() <= "z" for char in query)
        tokens = raw_tokens[:]
        if romanized:
            tokens = [ROMAN_ALIASES.get(token.lower(), token.lower()) for token in tokens]
            subject_column = "c.subject_roman"
            subject_terms = tokens
        else:
            tokens = ["dev" + "".join(f"{ord(char):x}" for char in token) if any("\u0900" <= char <= "\u097F" for char in token) else token for token in tokens]
            subject_column = "c.subject"
            subject_terms = raw_tokens
        match = " AND ".join(tokens[:12])
        subject_score = " + ".join(f"CASE WHEN {subject_column} LIKE ? THEN 1 ELSE 0 END" for _ in subject_terms[:12])
        sql = """
            SELECT c.case_id, c.case_type, c.type_label, c.nirnaya_no, c.path, c.preview, c.subject, c.subject_roman
            FROM cases_fts
            JOIN cases c ON c.rowid = cases_fts.rowid
            WHERE cases_fts MATCH ?
        """
        params = [match]
        if case_type:
            sql += " AND c.case_type = ?"
            params.append(case_type)
        params.extend(f"%{term}%" for term in subject_terms[:12])
        rows = con.execute(sql + f" ORDER BY ({subject_score}) DESC, c.case_type, CAST(c.case_id AS INTEGER) LIMIT ? OFFSET ?", params + [PAGE_SIZE + 1, offset]).fetchall()
        has_more = len(rows) > PAGE_SIZE
        rows = rows[:PAGE_SIZE]
    finally:
        con.close()

    results = []
    with ZipFile(ARCHIVE) as archive:
        for row in rows:
            text = read_case(archive, row[1], row[0])
            snippet, terms = snippet_for(text, query)
            results.append({
                "id": row[0],
                "type": row[1],
                "label": row[2],
                "nirnaya_no": row[3],
                "subject": row[6],
                "subject_highlight_terms": highlight_terms(row[6], query),
                "official_url": official_url(row[0]),
                "snippet": snippet,
                "highlight_terms": terms,
            })
    return results, has_more


class handler(BaseHTTPRequestHandler):
    def send_json(self, value, status=200):
        body = json.dumps(value, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)
        if parsed.path == "/api/stats":
            con = sqlite3.connect(DB)
            try:
                counts = dict(con.execute("SELECT case_type, count(*) FROM cases GROUP BY case_type"))
            finally:
                con.close()
            self.send_json({"total": sum(counts.values()), "types": [{"id": key, "label": TYPE_LABELS[key], "count": counts.get(key, 0)} for key in sorted(TYPE_LABELS)]})
            return

        if parsed.path == "/api/search":
            query = params.get("q", [""])[0].strip()
            raw_type = params.get("type", [""])[0]
            case_type = int(raw_type) if raw_type.isdigit() and int(raw_type) in TYPE_LABELS else None
            raw_page = params.get("page", ["1"])[0]
            page = min(max(int(raw_page), 1), 100000) if raw_page.isdigit() else 1
            results, has_more = search(query, case_type, page)
            self.send_json({"query": query, "page": page, "page_size": PAGE_SIZE, "has_more": has_more, "results": results})
            return

        if parsed.path == "/api/case":
            case_id = params.get("id", [""])[0]
            raw_type = params.get("type", [""])[0]
            query = params.get("q", [""])[0].strip()
            if not case_id.isdigit() or not raw_type.isdigit() or int(raw_type) not in TYPE_LABELS:
                self.send_json({"error": "Invalid case identifier"}, 400)
                return
            con = sqlite3.connect(DB)
            try:
                row = con.execute("SELECT nirnaya_no FROM cases WHERE case_id = ? AND case_type = ?", (case_id, int(raw_type))).fetchone()
            finally:
                con.close()
            try:
                with ZipFile(ARCHIVE) as archive:
                    text = read_case(archive, raw_type, case_id)
            except KeyError:
                self.send_json({"error": "Case not found"}, 404)
                return
            nirnaya_no = row[0] if row else case_id
            self.send_json({"id": case_id, "type": int(raw_type), "label": TYPE_LABELS[int(raw_type)], "nirnaya_no": nirnaya_no, "subject": case_subject(text), "official_url": official_url(case_id), "text": text, "highlight_terms": highlight_terms(text, query)})
            return

        self.send_error(404)
