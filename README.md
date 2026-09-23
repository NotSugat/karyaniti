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

The case labels follow the official NKP `mudda_type` categories:

- Type 1: Civil
- Type 2: Government Civil
- Type 3: Criminal
- Type 4: Government Criminal
- Type 5: Writ

The GLARA annotator does not label type 2, but Karyaniti keeps these government-civil cases in the search corpus.
