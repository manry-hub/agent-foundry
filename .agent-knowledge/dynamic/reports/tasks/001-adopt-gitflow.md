# 001 — Menerapkan Gitflow sebagai workflow Git

Tanggal: 2026-10-27

## Checklist

- [x] Aturan Git mendefinisikan branch permanen `main` dan `develop`.
- [x] Alur `feature`, `release`, dan `hotfix` beserta sumber dan target merge dicantumkan.
- [x] Referensi workflow Orca dan README diselaraskan dengan `develop` sebagai branch integrasi.

## Deskripsi Perubahan

Mengganti workflow berbasis `main` dengan Gitflow formal. Dokumentasi sekarang membedakan alur pengembangan, persiapan rilis, dan perbaikan produksi serta menetapkan back-merge rilis dan hotfix ke `develop`.

## Daftar File yang Diubah

- `.agent-knowledge/static/rules/GIT.md` — edit
- `.agent-knowledge/static/rules/ORCA-ORCHESTRATION.md` — edit
- `README.md` — edit
- `.agent-knowledge/dynamic/reports/tasks/001-adopt-gitflow.md` — add

## Review

- Result: Gitflow didokumentasikan untuk seluruh workflow repository.
- Verification: Pencarian referensi branch dan pemeriksaan diff dilakukan; tidak ada referensi workflow lama yang tersisa pada file yang terdampak.
- Follow-up: Konfigurasikan aturan branch protection pada hosting Git untuk `develop` dan sesuaikan proteksi `main` apabila belum ada.

## Verifikasi UAT (User Acceptance Test)

| # | Tes | Hasil |
| --- | --- | --- |
| 1 | Aturan mendefinisikan alur `feature → develop`, `release → main` serta kembali ke `develop`, dan `hotfix → main` serta kembali ke `develop`. | Lulus |
