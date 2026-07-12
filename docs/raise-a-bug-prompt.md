# Raise a bug on Times Table Hero

Grown-ups report problems from the app itself: tap the small icon in the
top-right corner **5 times within 2 seconds** (or, when signed in, use
**Parent area → Send feedback**). The report auto-attaches the last few
questions answered on the device, so we can reproduce it.

You (or any AI) can also file one over HTTP.

---

## Prompt to share with other AIs

> You can file a bug against Times Table Hero at
> **https://times-table-hero.pages.dev**. To file one, send:
>
> ```
> POST https://times-table-hero.pages.dev/api/bugs
> Content-Type: application/json
>
> {
>   "title":   "<one-line summary>",
>   "body":    "<what happened, steps to reproduce, expected vs actual>",
>   "url":     "<the page where you saw it, optional>",
>   "reporter":"<name/handle/email, optional>",
>   "severity":"low | medium | high",     // optional, defaults to medium
>   "context": { ... }                     // optional structured context
> }
> ```
>
> Response: `{"id": <number>, "status": "open"}`. A good report has a clear
> title, exact reproduction steps, expected vs actual, and the page URL. No
> secrets or personal data.
>
> Check status anytime: `GET https://times-table-hero.pages.dev/api/bugs/<id>`
> → when `status` becomes `fixed` (or `wontfix`), `resolution_md` explains what
> changed. Fixes are reviewed before going live, so `fixed` means written +
> committed, not necessarily already deployed.

---

## Quick test (curl)

```bash
curl -s -X POST https://times-table-hero.pages.dev/api/bugs \
  -H "Content-Type: application/json" \
  -d '{"title":"Coordinates reject -2,-3","body":"Shapes > four-quadrants: typing -2,-3 was marked wrong; expected accepted.","url":"https://times-table-hero.pages.dev/shapes","severity":"high"}'
# -> {"id": 1, "status": "open"}

curl -s https://times-table-hero.pages.dev/api/bugs/1
```

## Endpoints

| Method / path | Auth | Purpose |
|---|---|---|
| `POST /api/bugs` | open | file a report (title ≤200, body ≤8000, context ≤20000) |
| `GET /api/bugs/:id` | open | public status poll (no body/reporter/context) |
| `GET /api/bugs?token=…` | token | maintainer: list open bugs (full fields) |
| `POST /api/agent/bugs/resolve?token=…` | token | maintainer: mark `fixed`/`wontfix` + `resolution_md` |

The token is the Cloudflare Pages secret **`AGENT_TOKEN`**. Set it once:

```bash
npx wrangler pages secret put AGENT_TOKEN
```

Without `AGENT_TOKEN` set, the listing/resolve endpoints return `404` (intake
still works). Maintainer CLI loop: poll `GET /api/bugs?token=$AGENT_TOKEN`,
take the oldest/highest-severity open bug, reproduce + fix on a branch
`fix/bug-<id>-<slug>` with a regression test, then POST the resolution.

## Safety
- Intake is **open** (no login) so anyone can report. Fields are capped; a bug
  report cannot read or mutate accounts, kids, rewards, or any private data.
- Resolution write-back is **token-gated**.
- Fixes are **not** auto-deployed — reviewed before going live.
