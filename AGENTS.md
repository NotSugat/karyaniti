# Karyaniti repository notes

## Feedback

When asked whether new feedback exists, run this from the repository root:

```bash
TOKEN=$(tr -d '\n' < feedback/.admin-token)
curl -fsS \
  -H "Authorization: Bearer $TOKEN" \
  https://karyaniti-feedback.sugatsujakhu.workers.dev/feedback | python3 -m json.tool
```

The feedback data is stored in Cloudflare D1. Never print, commit, or upload `feedback/.admin-token`.
