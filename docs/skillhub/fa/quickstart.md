# شروع سریع

اگر سازمان شما SkillHub را راه‌اندازی کرده است، از نشانی‌ای که مدیر داده استفاده کنید و بخش «ورود و انتخاب زبان» را بخوانید. فرمان‌های زیر برای مدیر یا توسعه‌دهنده‌ای هستند که محیط جدید می‌سازد.

## اجرای محلی از سورس

برای مسیر توسعه به Java 21، Node.js، pnpm مطابق نسخهٔ اعلام‌شده در `web/package.json`، Make و Docker نیاز دارید. از ترمینال سازگار با Make و اسکریپت‌های Bash پروژه استفاده کنید؛ در Windows می‌توانید این مسیر را در WSL اجرا کنید.

```bash
git clone https://github.com/iflytek/skillhub.git
cd skillhub
make dev-all
```

| سرویس در مسیر توسعه | نشانی |
| --- | --- |
| رابط وب | `http://localhost:3000` |
| API | `http://localhost:8080` |
| اسکنر | `http://localhost:8000` |

برای بررسی وضعیت و لاگ‌ها:

```bash
make dev-status
make dev-logs
```

برای توقف محیط از `make dev-all-down` استفاده کنید. گزینه‌های reset داده‌ها را پاک می‌کنند؛ برای رفع مشکل ورود نیازی به پاک‌کردن خودکار پایگاه داده نیست.

## راه‌اندازی با Docker Compose

در ریشهٔ سورس، الگوی تنظیمات را کپی و مقدارهای واقعی را وارد کنید:

```bash
cp .env.release.example .env.release
make validate-release-config
docker compose --env-file .env.release -f compose.release.yml up -d
docker compose --env-file .env.release -f compose.release.yml ps
```

پیش از اعتبارسنجی، رمزها، نشانی عمومی و مقادیر placeholder را در `.env.release` تنظیم کنید. مقدار `SKILLHUB_DOWNLOAD_ANON_COOKIE_SECRET` باید تصادفی و دست‌کم ۳۲ نویسه باشد. فایل تنظیمات حاوی رازها را منتشر نکنید. نسخهٔ imageها و ذخیره‌ساز را صریح انتخاب کنید؛ دریافت image منتشرشده الزاماً شامل تغییرهای محلی سورس شما نیست.

در Compose انتشار، پورت وب با `WEB_PORT` تعیین می‌شود و مقدار پیش‌فرض آن `80` است؛ آن را با پورت `3000` محیط توسعه اشتباه نگیرید. پیش از ارتقا از پایگاه داده و فایل‌های بسته پشتیبان بگیرید. راهنمای [Kubernetes](./guide/kubernetes) مسیر دیگری برای استقرار است.

## ورود و انتخاب زبان

۱. نشانی رابط وب را باز کنید و از فهرست زبان، «فارسی» را انتخاب کنید.

۲. از روشی که مدیر فعال کرده است وارد شوید: نام کاربری و رمز، یا ارائه‌دهندهٔ ورود سازمانی. ثبت‌نام فقط در صورت فعال‌بودن آن در دسترس است.

۳. در پروفایل می‌توانید نام نمایشی فارسی وارد کنید؛ ممکن است تغییر نام به بررسی مدیر نیاز داشته باشد.

در پروفایل محلی، حساب bootstrap در صورت فعال‌بودن با نام `admin` و رمز پیش‌فرض `ChangeMe!2026` ساخته می‌شود. در محیط واقعی رمز مناسب تعیین کنید. تغییر متغیر bootstrap به معنی تغییر رمز حسابی که قبلاً در پایگاه داده ساخته شده نیست.

## نصب خط فرمان

```bash
npm install -g @astron-team/skillhub
```

نشانی مخزن خود را تنظیم کنید. برای Bash:

```bash
export SKILLHUB_REGISTRY=http://localhost:8080
skillhub login
skillhub search pdf
skillhub install pdf-parser --agent codex
```

برای PowerShell:

```powershell
$env:SKILLHUB_REGISTRY = 'http://localhost:8080'
skillhub login
skillhub search pdf
```

فرمان `login` مسیر ورود دستگاه را آغاز می‌کند؛ در مرورگر کد و مخزن را بررسی و درخواست خودتان را تأیید کنید. توکن API هم با `--token` پشتیبانی می‌شود. جزئیات در [راهنمای خط فرمان](./guide/cli) آمده است.

## اولین انتشار

در ریشهٔ پوشهٔ `my-skill` فایل `SKILL.md` بسازید:

```markdown
---
name: my-skill
description: Summarize a short text as numbered steps.
version: 1.0.0
---

Summarize the supplied text as numbered steps.
```

پس از ساخت فضای نام و دریافت دسترسی مناسب:

```bash
skillhub publish ./my-skill --namespace my-team
```

در رابط وب نیز می‌توانید از صفحهٔ انتشار، فضای نام را انتخاب و ZIP بسته را بارگذاری کنید. ریشهٔ بسته باید `SKILL.md` با همین بزرگی حروف داشته باشد. جزئیات ساختار، هشدارها و وضعیت‌ها در [راهنمای انتشار](./guide/skill-publish) است.
