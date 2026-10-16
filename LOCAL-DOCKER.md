# SkillHub built from source on Windows

Source: https://github.com/iflytek/skillhub, commit `7893331c`.

The `server`, `web`, and `skill-scanner` images are built from the cloned source
using the upstream Dockerfiles. PostgreSQL 16 and Redis 7 use official images.
`compose.source.yml` extends the upstream `compose.release.yml`.

- Web: http://localhost:3000
- API / health: http://localhost:8080/actuator/health
- Admin username: `admin`
- Admin password: `BOOTSTRAP_ADMIN_PASSWORD` in `.env.source`

For a fresh clone, copy `.env.source.example` to `.env.source` and replace every
`REPLACE_WITH_...` value with an independent random secret. The template selects
local filesystem storage in a Docker volume. No personal `.dev` tools are needed.

Run from this directory in PowerShell:

```powershell
.\source.ps1 start
.\source.ps1 status
.\source.ps1 logs
.\source.ps1 stop
.\source.ps1 build
.\verify-source.ps1
```

`start` builds the application images, starts the stack, and waits for health
checks. `stop` preserves the database, Redis, and skill storage volumes.
The web and API ports bind to this computer's loopback interface. PostgreSQL
and Redis are available only inside the SkillHub Compose network.

`.env.source` contains generated local credentials and is ignored by Git.
The optional LLM scanner integration needs an API key; the scanner's other
checks run without one. OAuth and SMTP are optional and are not configured.

Git checkout uses original LF endings (`core.autocrlf=false`) so Linux scripts
can execute correctly in Docker.

Verified on 2026-10-15: all five services healthy; backend health, web page,
API proxy, anonymous access protection, admin login, authenticated user,
namespace listing, and admin auth configuration checks passed.

## Persian deployment — 2026-10-15

The current working tree based on c9887f5f has been built and deployed locally as
source-persian-20261015. The backend and Nginx frontend contain the Persian UI,
IRANSans assets and server messages. The scanner is unchanged. .env.source now
selects this local tag; source.ps1 start/status/logs continue to use the same
persistent volumes and loopback ports.

Flyway V70 and the admin search rebuild succeeded on the local database. All five
services are healthy; eight verify-source checks and all 18 API smoke checks pass.
Real Persian admin login and discovery were checked in Chromium at 360px/1440px.
No public guide was published. Deployment logs, screenshots, pre-upgrade database
backup and previous environment are kept in ignored .dev/persian-deploy. The old
server/web images are also retained as before-persian-20261015. Full evidence and
remaining validation limits are in docs/persian-localization.md.
