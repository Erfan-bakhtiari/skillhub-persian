# استقرار Kubernetes

الگوهای پروژه در `deploy/k8s` شامل سرویس‌ها، استقرار سرور و وب، اسکنر، ingress و دو overlay هستند: `with-infra` برای PostgreSQL و Redis همراه، و `external` برای زیرساخت موجود.

## آماده‌سازی

به کلاستر، `kubectl` با دسترسی مناسب، ذخیره‌ساز پایدار و در صورت استفاده از دامنه، ingress controller نیاز دارید. نسخهٔ imageهای سرور، وب و اسکنر را در تنظیمات Kustomize مشخص و سازگاری آن‌ها را پیش از اجرا بررسی کنید.

از ریشهٔ checkout:

```bash
cp deploy/k8s/base/secret.yaml.example deploy/k8s/base/secret.yaml
```

فایل ساخته‌شده را با رمزها و نشانی واقعی ویرایش کنید. مقدارهای نمونه را به محیط واقعی نبرید و فایل راز را commit نکنید. `base/kustomization.yaml` فایل `secret.yaml` را به صورت خودکار فهرست نکرده است؛ Secret باید جداگانه در namespace درست اعمال شود یا مدیریت راز سازمان آن را تأمین کند.

| تنظیم | محل بررسی |
| --- | --- |
| اتصال و رمز PostgreSQL | Secret و پیکربندی سرویس پایگاه داده |
| میزبان و احراز هویت Redis | ConfigMap و Secret |
| نشانی عمومی، OAuth و ingress | ConfigMap، Secret و ingress |
| ذخیره‌ساز بسته‌ها | ConfigMap، Secret و volume یا S3 |
| اسکنر و ارائه‌دهندهٔ اختیاری مدل | deployment اسکنر و Secret |

## مسیر دارای زیرساخت همراه

ابتدا تنظیمات را آماده و manifest نهایی را برای بازبینی تولید کنید:

```bash
kubectl kustomize deploy/k8s/overlays/with-infra > skillhub-rendered.yaml
```

پس از بررسی منابع، Secretها و نسخه‌ها، عملیات استقرار از ریشهٔ checkout چنین است:

```bash
kubectl create namespace skillhub
kubectl apply -n skillhub -f deploy/k8s/base/secret.yaml
kubectl apply -k deploy/k8s/overlays/with-infra
kubectl get pods -n skillhub
kubectl get services -n skillhub
```

اگر namespace از قبل وجود دارد، ایجاد دوبارهٔ آن لازم نیست. credential مصرف‌شده در StatefulSet پایگاه داده باید با Secret سرور هماهنگ باشد؛ فقط تغییر یکی از آن‌ها اتصال را درست نمی‌کند.

## استفاده از زیرساخت موجود

میزبان PostgreSQL و Redis و پیکربندی TLS و احراز هویت را مطابق سرویس‌های واقعی در Secret و ConfigMap تنظیم کنید. سپس overlay خارجی را بازبینی و اعمال کنید:

```bash
kubectl kustomize deploy/k8s/overlays/external > skillhub-rendered.yaml
kubectl apply -k deploy/k8s/overlays/external
```

این فرمان‌ها دستور استقرارند؛ بازکردن راهنما آن‌ها را اجرا نمی‌کند. تنظیمات شبکه، TLS، پشتیبان‌گیری و ظرفیت باید با محیط سازمان تطبیق داده شوند.

## ارتقا و مهاجرت

پیش از ارتقا از پایگاه داده و object storage پشتیبان بگیرید. Flyway مهاجرت‌های نسخهٔ سرور را اجرا می‌کند. مهاجرت فارسی جست‌وجو، `V70`، بردار تمام‌متن و GIN را دوباره می‌سازد و قفل جدول می‌گیرد؛ زمان مناسب را با اندازهٔ داده تعیین کنید.

بعد از اجرای سرور جدید، مدیر کل باید عملیات موجود `POST /api/v1/admin/search/rebuild` را یک‌بار با احراز هویت معتبر انجام دهد تا embeddingهای قدیمی نیز بازسازی شوند. موفقیت مهاجرت به‌تنهایی به معنی تازه‌شدن این بردارهای Java نیست.

پیش از پایان استقرار، ورود، جست‌وجوی فارسی، دانلود و یک چرخهٔ انتشار/اسکن/بررسی را در محیط خودتان کنترل کنید. هیچ کلاستر واقعی در تهیهٔ این ترجمه راه‌اندازی یا تغییر داده نشده است.
