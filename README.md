# Karyaniti

Searchable browser for the Nepal Supreme Court case corpus.

Search accepts Devanagari and Romanized Nepali. For example, `samandha biched` finds cases containing `सम्बन्ध विच्छेद`.

## Deploy

The repository includes a compact SQLite search index and the source case archive. Deploy with:

```bash
vercel --prod
```

The Vercel API serves Devanagari and Romanized Nepali search, category filters, latest cases, and full case text from the archive.

The archive filename number is used for the official Nepal Law Journal URL. The displayed case number is parsed from the document's `निर्णय नं.` heading.

## Run locally

```bash
vercel dev
```

Open <http://localhost:8000>.

## Data

The deployment index is `data/karyaniti.db`; source case text is in `data/nkp_cases_with_rit.zip`.

The case labels follow `glara-annotator/lib/case-types.ts`:

- Type 1: Civil
- Type 3: Writ
- Type 4: Criminal
- Type 5: Special

The archive contains nine type 2 cases, but the annotator has no type 2 label. Karyaniti keeps them as `Unmapped` so no source cases disappear.
