# Security Findings — MeetGuru (site + mobile + shared backend)

Consolidated hand-off list for the developer. Each item is deferred (not yet fixed),
with location, impact, and a suggested remediation. Ordered by severity.

Backend note: this is a self-hosted Supabase (sb.meetgu.ru) + PeerTube (video.meetgu.ru)
stack shared by the Vue site (`~/meetclone`, deployed to app.meetgu.ru) and the React
Native app (`~/meetguru-mobile`). RLS is currently OFF across all public tables, so the
anon key already has full read/write — several findings below stem from that.

---

## SF-1 — PeerTube system-account credentials exposed to any site visitor  (HIGH)

**What:** All video uploads/deletes (and, once built, live streams) run through a SINGLE
shared PeerTube "system" account. Its OAuth client credentials are hard-coded **client-side**
and its refresh token lives in a world-readable table:

- **OAuth `client_id` + `client_secret`** (local OAuth client, id prefix `rf2ju4r8…`) are baked
  into the deployed page data served to every visitor:
  - `~/meetclone/public/data/16089944-2b20-4dd4-a9a1-f5142bd80c4e.json` (courses_manage page —
    the `grant_type=refresh_token` call to `https://video.meetgu.ru/api/v1/users/token`)
  - same string appears in other page-data JSON files and the "PeerTube Uploader" element
    (`src/components/elements/element-6dcad208-0a67-43a2-bd1d-3b13ff5819cf/`)
- **`token` + `refresh_token`** for that account sit in Supabase table `public.Peertube_System`
  (single row), readable with the public anon key (RLS off).
- **Worse:** the same page data contains a `grant_type=password` fallback with the PeerTube
  account's **plaintext login and password** (username `upload`) — i.e. not just a rotating
  token but the actual account credentials are exposed to every visitor.

**Impact:** Anyone who views the site can extract the client credentials and, combined with the
refresh token from `Peertube_System` (also anon-readable), obtain a valid access token for the
PeerTube system account — i.e. upload, delete, or (soon) start/stop live streams and mutate any
video on the instance. Effectively the media backend is publicly writable.

**Why it exists:** legacy WeWeb design did the PeerTube OAuth dance in the browser instead of a
trusted server component.

**Recommended remediation:**
- Move the PeerTube token exchange server-side (n8n workflow or a Supabase Edge Function) so the
  `client_secret` and refresh token never reach the client; the browser calls our own endpoint
  which returns only a short-lived, scoped result (or performs the upload/live-create itself).
- **Rotate** the leaked `client_secret` after moving it (the current value must be considered burned).
- Put RLS on `Peertube_System` so the anon key cannot read the tokens (see SF-2).
- Longer term, consider per-speaker PeerTube accounts instead of one shared system account
  (also removes the `maxUserLives=3`-per-account ceiling for live streaming).

---

## SF-2 — RLS disabled on all public tables; anon key has full read/write  (HIGH)

**What:** Row Level Security is off project-wide; the public anon key (shipped in the site and
the mobile app) can read and write every table directly.

**Impact:** Any client can read all users' data and write arbitrary rows — e.g. grant themselves
course access (`user_course`), tamper with orders/sales, forge reviews/ratings, read the PeerTube
tokens (SF-1), read private chat, etc. All "gating" is client-side only and trivially bypassed.

**Recommended remediation:** design an RLS rollout: enable RLS per table with policies scoped to
`auth.uid()`, and move privileged/money operations (course access grants, order/sales mutation,
withdrawals, jsonb review appends) behind `SECURITY DEFINER` RPCs that enforce ownership. This is
a substantial, holistic piece of work — sequence it table-by-table.

---

## SF-3 — Money & content-integrity operations are client-trusted  (MEDIUM, subset of SF-2)

**What:** Reviews/ratings are read-modify-write into `course.comment` / `course.rating` jsonb from
the client; order/sales and withdrawal flows likewise trust client-supplied values. Membership
checks (who may review, who may watch) are enforced only in the UI.

**Impact:** Fabricated reviews/ratings, potential manipulation of financial records, review-gating
bypass.

**Recommended remediation:** fold into the SF-2 RLS/RPC work — validate membership and ownership
server-side before any such write; make jsonb appends idempotent and authorised in an RPC.

---

## SF-4 — Video access relies on "unlisted" obscurity, not authorization  (LOW/MEDIUM)

**What:** Course/lesson videos are PeerTube "Unlisted": their HLS master playlist (and a single
downloadable fragmented MP4) return 200 without auth. Access is gated only by not surfacing the
video id in the UI to users who haven't paid.

**Impact:** Anyone who obtains a video id (shared link, inspecting network traffic of a legitimate
buyer) can stream or download the paid content without a purchase.

**Recommended remediation:** if paid-content protection matters, move to PeerTube private videos
with authenticated playlist access (signed/time-limited URLs) or a token-gated proxy. Accept-risk
is reasonable for promo videos but not for premium lessons — decide per content tier.

---

_Last updated: 2026-08-03. SF-1 discovered during PeerTube Live reconnaissance._
