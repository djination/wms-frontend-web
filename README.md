# WMS Frontend Web

Konsol operasional WMS berbasis **Next.js 15** (App Router) dan **React 19**. Menu dinamis dari API access management; semua data operasional diambil dari backend NestJS.

Dokumentasi monorepo: [`../README.md`](../README.md)

## Prasyarat

- Node.js 22+
- Backend API berjalan (`http://localhost:4000` default)
- Middleware FastAPI (opsional) — hanya untuk halaman **Integrasi → Sinkron data**

## Setup cepat

```bash
cp .env.example .env
npm install
npm run dev
```

Buka `http://localhost:3000` (port dari `PORT` di `.env`, default `3000`).

Login default (setelah `npm run seed:access` di backend): sesuaikan dengan `SEED_ADMIN_*` di backend, atau user yang dibuat lewat `/access/users`.

## Struktur folder

```txt
frontend-web/
  src/
    app/
      signup/             # Daftar tenant SaaS + polling provision
      login/              # Login tenant (slug + JWT operasional)
      (platform)/         # Konsol platform admin (JWT terpisah)
        platform/login/
        platform/tenants/
      (app)/              # Layout terautentikasi (AppShell + sidebar)
        dashboard/
        master-data/
        inbound/
        outbound/
        process/
        billing/
        access/
        integration/
        inventory/
    components/
      app/                # AppShell, AppHeader, AppSidebar
      master-data/
      inbound/
      outbound/
      billing/
      process-flow/
      access-management/
      integration/
      ui/
    lib/
      api.ts              # Client API backend (Bearer JWT + X-Tenant-Slug)
      tenant-context.ts   # Resolve slug dari subdomain/query/env
      tenant-signup-api.ts
      platform-api.ts
      session.ts          # Token tenant + platform + tenant slug
      middlewareApi.ts    # Client middleware FastAPI
      useWmsData.ts       # Hook data master
      kpi-api.ts
  scripts/
    run-next.cjs          # Memuat .env sebelum next dev/start
  public/
  Dockerfile
```

## Route aplikasi

| Modul | Path |
| --- | --- |
| Signup tenant | `/signup` |
| Login tenant | `/login` |
| Platform admin login | `/platform/login` |
| Platform tenants | `/platform/tenants`, `/platform/tenants/new`, `/platform/tenants/[id]` |
| Platform plans | `/platform/plans` |
| Platform feature flags | `/platform/feature-flags` |
| Platform users | `/platform/users` |
| Platform settings | `/platform/settings` |
| Platform audit log | `/platform/audit-logs` |
| Dashboard / KPI | `/dashboard` |
| Master data | `/master-data/customers`, `/operators`, `/warehouses`, `/areas`, `/zones`, `/bins`, `/products`, `/suppliers`, `/uoms`, `/product-uom-conversions`, `/inventory` |
| Inventory | `/inventory/balance` |
| Inbound | `/inbound/asn`, `/inbound/receiving`, `/inbound/history`, `/inbound/manifest-review` |
| Outbound | `/outbound/sales-orders`, `/outbound/waves`, `/outbound/tasks` |
| Process flow | `/process/transfers`, `/process/transformations`, `/process/recipes`, `/process/activity` |
| Billing | `/billing/contracts`, `/billing/rates`, `/billing/transactions`, `/billing/summary` |
| Access | `/access/users`, `/access/roles`, `/access/menus` |
| Integrasi | `/integration/data-sync` |

Sidebar dan izin akses mengikuti `GET /access/my-menus` — hanya menu yang di-assign ke role user yang tampil.

## Scripts npm

| Perintah | Fungsi |
| --- | --- |
| `npm run dev` | Dev server (hot reload) |
| `npm run build` | Production build |
| `npm run start` | Jalankan build production |
| `npm run lint` | ESLint (Next.js) |

## Environment (`.env`)

Salin dari `.env.example`:

| Variabel | Wajib | Keterangan |
| --- | --- | --- |
| `PORT` | — | Port Next.js (default `3000`) |
| `NEXT_PUBLIC_API_URL` | Ya | URL backend untuk browser |
| `NEXT_PUBLIC_TENANT_DEFAULT_SLUG` | — | Slug fallback (dev: `default`) |
| `NEXT_PUBLIC_TENANT_BASE_DOMAIN` | — | Domain basis subdomain tenant (prod) |
| `NEXT_PUBLIC_PLATFORM_SUBDOMAIN` | — | Subdomain konsol platform (default `admin`) |
| `API_INTERNAL_URL` | — | URL backend dari server Next (Docker: `http://api:4000`) |
| `NEXT_PUBLIC_MIDDLEWARE_URL` | — | URL middleware FastAPI (halaman data-sync) |
| `NEXT_PUBLIC_ASN_NO_PREFIX` | — | Prefix nomor ASN otomatis |
| `NEXT_PUBLIC_SALES_ORDER_NO_PREFIX` | — | Prefix nomor sales order |
| `NEXT_PUBLIC_WAVE_NO_PREFIX` | — | Prefix nomor wave |

Variabel `NEXT_PUBLIC_*` di-embed saat build — ubah lalu rebuild jika deploy production.

## Autentikasi & multi-tenant (SaaS)

**Tenant operasional:** login di `/login` dengan slug tenant (disimpan di localStorage). Request API membawa `Authorization: Bearer …` dan header `X-Tenant-Slug` (dari slug tersimpan, subdomain `demo.localhost`, query `?tenant=demo`, atau `NEXT_PUBLIC_TENANT_DEFAULT_SLUG`).

**Signup:** `/signup` memanggil `POST /tenants/signup`, lalu polling `GET /tenants/:slug/provision-status` sampai `ready`, kemudian redirect ke login.

**Platform admin:** host `admin.localhost` (atau subdomain `NEXT_PUBLIC_PLATFORM_SUBDOMAIN`) mengarah ke `/platform/login`. JWT platform terpisah (`wms_platform_token`); tidak mengirim `X-Tenant-Slug` ke endpoint `/platform/*`.

## Docker

```bash
# Dari root monorepo
docker compose up -d --build web
```

Build arg `NEXT_PUBLIC_API_URL` diambil dari `.env` root monorepo. Runtime internal memakai `API_INTERNAL_URL=http://api:4000`.

## Pengembangan

- Komponen form master data mengikuti pola `MasterDataPanel` + `Create*Form` + `*EditDetail`.
- Filter warehouse/customer konsisten via `lib/warehouse-customer-filter.ts`.
- KPI dashboard memanggil `GET /kpi/summary` dengan filter tanggal, warehouse, customer.
