from pathlib import Path
import re
import sqlite3
from zipfile import ZipFile

from build_index import TYPE_LABELS, case_subject, preview, romanize


ROOT = Path(__file__).parent
ARCHIVE = ROOT / "data" / "nkp_cases_with_rit.zip"
DB = ROOT / "data" / "karyaniti.db"
DEVANAGARI_WORD = re.compile(r"[\u0900-\u097F]+")
NIRNAYA_NUMBER = re.compile(r"निर्णय\s*नं\.?\s*([०-९0-9]+)")


def devanagari_key(word: str) -> str:
    return "dev" + "".join(f"{ord(char):x}" for char in word)


def searchable_text(text: str) -> str:
    encoded = DEVANAGARI_WORD.sub(lambda match: devanagari_key(match.group()), text)
    return romanize(text) + " " + encoded


def nirnaya_number(text: str, fallback: str) -> str:
    match = NIRNAYA_NUMBER.search(text[:2000])
    return match.group(1) if match else fallback


def build() -> None:
    DB.unlink(missing_ok=True)
    con = sqlite3.connect(DB)
    con.executescript(
        """
        PRAGMA journal_mode = OFF;
        PRAGMA synchronous = OFF;
        CREATE TABLE cases (
            case_id TEXT NOT NULL,
            case_type INTEGER NOT NULL,
            type_label TEXT NOT NULL,
            nirnaya_no TEXT NOT NULL,
            subject TEXT NOT NULL,
            subject_roman TEXT NOT NULL,
            path TEXT NOT NULL UNIQUE,
            preview TEXT NOT NULL
        );
        CREATE VIRTUAL TABLE cases_fts USING fts5(content, content='', detail=none);
        """
    )

    indexed = 0
    with ZipFile(ARCHIVE) as archive, con:
        for name in sorted(archive.namelist()):
            match = re.fullmatch(r"nkp_cases/mudda_type_(\d+)/case_(\d+)\.txt", name)
            if not match:
                continue
            case_type = int(match.group(1))
            case_id = match.group(2)
            text = archive.read(name).decode("utf-8", errors="replace")
            subject = case_subject(text)
            cursor = con.execute(
                "INSERT INTO cases VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (case_id, case_type, TYPE_LABELS.get(case_type, "Type " + str(case_type)), nirnaya_number(text, case_id), subject, romanize(subject), name, preview(text)),
            )
            con.execute(
                "INSERT INTO cases_fts(rowid, content) VALUES (?, ?)",
                (cursor.lastrowid, searchable_text(text)),
            )
            indexed += 1
            if indexed % 500 == 0:
                print("indexed", indexed, flush=True)

    con.execute("CREATE INDEX cases_type_idx ON cases(case_type)")
    con.commit()
    con.execute("VACUUM")
    con.close()
    print("indexed", indexed, "cases")


if __name__ == "__main__":
    build()
