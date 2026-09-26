# Karyaniti repository notes

## Local development and deployment

- Run the app locally with `python3 dev.py` and open <http://localhost:8000>. This uses the checked-in SQLite index and archive.
- Deploy with `vercel --prod`. Keep `vercel.json` and `api/index.py` as the production path; the local runner is only for development.
- Search data lives in `data/karyaniti.db` and `data/nkp_cases_with_rit.zip`. Cloudflare D1 is used only by the feedback worker, not case search.

## Feedback

When asked whether new feedback exists, run this from the repository root:

```bash
TOKEN=$(tr -d '\n' < feedback/.admin-token)
curl -fsS \
  -H "Authorization: Bearer $TOKEN" \
  https://karyaniti-feedback.sugatsujakhu.workers.dev/feedback | python3 -m json.tool
```

The feedback data is stored in Cloudflare D1. Never print, commit, or upload `feedback/.admin-token`.
