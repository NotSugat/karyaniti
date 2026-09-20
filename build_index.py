from pathlib import Path
import re
import sqlite3


ROOT = Path(__file__).parent
CASES = ROOT / "data" / "cases"
DB = ROOT / "data" / "karyaniti.db"
TYPE_LABELS = {
    1: "Civil",
    2: "Unmapped",
    3: "Writ",
    4: "Criminal",
    5: "Special",
}

VOWELS = {
    "अ": "a", "आ": "aa", "इ": "i", "ई": "ii", "उ": "u", "ऊ": "uu",
    "ए": "e", "ऐ": "ai", "ओ": "o", "औ": "au", "ऋ": "ri",
}
MATRAS = {
    "ा": "aa", "ि": "i", "ी": "ii", "ु": "u", "ू": "uu",
    "ृ": "ri", "े": "e", "ै": "ai", "ो": "o", "ौ": "au",
}
CONSONANTS = {
    "क": "k", "ख": "kh", "ग": "g", "घ": "gh", "ङ": "ng", "च": "ch", "छ": "chh",
    "ज": "j", "झ": "jh", "ञ": "ny", "ट": "t", "ठ": "th", "ड": "d", "ढ": "dh",
    "ण": "n", "त": "t", "थ": "th", "द": "d", "ध": "dh", "न": "n", "प": "p",
    "फ": "ph", "ब": "b", "भ": "bh", "म": "m", "य": "y", "र": "r", "ल": "l",
    "व": "v", "श": "sh", "ष": "sh", "स": "s", "ह": "h",
}


def romanize(text: str) -> str:
    output = []
    chars = list(text)
    index = 0
    while index < len(chars):
        char = chars[index]
        if char in VOWELS:
            output.append(VOWELS[char])
        elif char in CONSONANTS:
            output.append(CONSONANTS[char])
            next_char = chars[index + 1] if index + 1 < len(chars) else ""
            if next_char == "्":
                index += 1
            elif next_char in MATRAS:
                output.append(MATRAS[next_char])
                index += 1
            else:
                output.append("a")
        elif char == "ं":
            output.append("n")
        elif char == "ः":
            output.append("h")
        elif char in "।॥":
            output.append(" ")
        else:
            output.append(char.lower())
        index += 1
    return "".join(output)


def preview(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()[:420]


def build() -> None:
    DB.unlink(missing_ok=True)
    con = sqlite3.connect(DB)
    con.execute("PRAGMA journal_mode = WAL")
    con.execute(
        """
        CREATE TABLE cases (
            case_id TEXT NOT NULL,
            case_type INTEGER NOT NULL,
            type_label TEXT NOT NULL,
            path TEXT NOT NULL UNIQUE,
            preview TEXT NOT NULL
        )
        """
    )
    con.execute("CREATE VIRTUAL TABLE cases_fts USING fts5(case_id UNINDEXED, content, roman_content)")

    rows = []
    for path in sorted(CASES.glob("mudda_type_*/*.txt")):
        match = re.fullmatch(r"mudda_type_(\d+)", path.parent.name)
        if not match:
            continue
        case_type = int(match.group(1))
        case_id = path.stem.removeprefix("case_")
        text = path.read_text(encoding="utf-8", errors="replace")
        relative = path.relative_to(CASES).as_posix()
        rows.append((case_id, case_type, TYPE_LABELS.get(case_type, "Unmapped"), relative, preview(text), text, romanize(text)))
        if len(rows) >= 100:
            con.executemany("INSERT INTO cases VALUES (?, ?, ?, ?, ?)", (row[:5] for row in rows))
            con.executemany("INSERT INTO cases_fts(case_id, content, roman_content) VALUES (?, ?, ?)", ((row[0], row[5], row[6]) for row in rows))
            rows.clear()
            print("indexed", con.execute("SELECT count(*) FROM cases").fetchone()[0], flush=True)

    if rows:
        con.executemany("INSERT INTO cases VALUES (?, ?, ?, ?, ?)", (row[:5] for row in rows))
        con.executemany("INSERT INTO cases_fts(case_id, content, roman_content) VALUES (?, ?, ?)", ((row[0], row[5], row[6]) for row in rows))
    con.execute("CREATE INDEX cases_type_idx ON cases(case_type)")
    con.commit()
    con.close()
    print("indexed", sum(1 for _ in CASES.glob("mudda_type_*/*.txt")), "cases")


if __name__ == "__main__":
    build()
