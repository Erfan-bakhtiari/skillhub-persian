# خط فرمان SkillHub

CLI رسمی برای جست‌وجو، نصب و انتشار بسته است. مثال‌های این صفحه فرمان واقعی‌اند و باید با همان نام‌ها و فلگ‌های لاتین اجرا شوند. help و بعضی خطاهای CLI ممکن است انگلیسی باشند.

## نصب و انتخاب مخزن

```bash
npm install -g @astron-team/skillhub
skillhub version
```

اولویت انتخاب مخزن به ترتیب `--registry`، متغیر `SKILLHUB_REGISTRY`، مقدار ذخیره‌شده در `~/.skillhub/config.json` و پیش‌فرض CLI است. برای محیط سازمانی، نشانی مخزن خود را صریح تعیین کنید.

در Bash:

```bash
export SKILLHUB_REGISTRY=https://skillhub.example.com
skillhub search pdf
```

در PowerShell:

```powershell
$env:SKILLHUB_REGISTRY = 'https://skillhub.example.com'
skillhub search pdf
```

دامنهٔ `skillhub.example.com` نمونه است؛ آن را با مخزن واقعی جایگزین کنید.

## ورود و خروج

```bash
skillhub login
skillhub whoami
skillhub logout
```

ورود بدون توکن از جریان دستگاه استفاده می‌کند. کد و نشانی نشان‌داده‌شده را در مرورگر بررسی و درخواست خودتان را تأیید کنید. با `skillhub login --no-open` می‌توانید بازشدن خودکار مرورگر را غیرفعال کنید.

برای توکن API، توکن را در تنظیمات حساب بسازید و با `skillhub login --token` به CLI بدهید. مقدار واقعی آن را در مثال‌ها، گزارش خطا یا مخزن کد قرار ندهید. توکن با اولویت فلگ `--token`، متغیر `SKILLHUB_TOKEN` و اعتبارنامهٔ ذخیره‌شدهٔ همان مخزن انتخاب می‌شود.

خروج، توکن ذخیره‌شدهٔ مخزن انتخاب‌شده را از دستگاه پاک می‌کند؛ لغو خود توکن در سرور عملیات جداگانه‌ای است. توکن نامعتبر را تازه یا حذف کنید؛ انتظار نداشته باشید درخواست دارای توکن خراب به حالت ناشناس برگردد.

## جست‌وجو و نصب

```bash
skillhub search pdf
skillhub search pdf --json
skillhub install pdf-parser --agent codex
skillhub install @my-team/my-skill --version 1.2.0 --agent codex
skillhub install my-skill --namespace my-team --scope project --agent codex
skillhub list
```

نصب در سطح `user` یا `project` و انتخاب عامل با `--agent` انجام می‌شود. برای مسیر صریح از `--dir` استفاده کنید. `--force` را فقط پس از بررسی تغییرات فایل‌های محلی به کار ببرید.

مختصات صریح `@my-team/my-skill`، `my-team/my-skill` و `my-team--my-skill` پشتیبانی می‌شوند. slug ساده به طور پیش‌فرض در فضای نام `global` جست‌وجو می‌شود. اگر هم مختصات و هم `--namespace` را بدهید، باید یکسان باشند.

## انتشار

```bash
skillhub publish ./my-skill --namespace my-team
```

ریشهٔ `./my-skill` باید `SKILL.md` داشته باشد. جزئیات در [انتشار و نسخه‌بندی](./skill-publish) است. خطای ۴۰۰ را با متن پاسخ و `Request ID` بررسی کنید؛ ارسال دوبارهٔ بدون تغییر، مشکل ساختار بسته یا نسخهٔ تکراری را رفع نمی‌کند.

## راهنمای نسخهٔ نصب‌شده

```bash
skillhub --help
skillhub install --help
skillhub publish --help
```

در خودکارسازی، قرارداد `--json` را حفظ کنید؛ نام فیلدهای JSON و enumها فارسی نمی‌شوند. ترجمهٔ این راهنما به معنی تغییر قرارداد CLI یا سازگاری ابزارهای ClawHub نیست.
