# SETUPDOCS — Inisialisasi Dokumentasi Proyek Berjalan

Gunakan prompt ini secara manual untuk mengisi atau merapikan dokumentasi produk dan desain berdasarkan codebase yang sudah ada. Perlakukan proyek sebagai proyek lanjutan: pahami implementasi dan keputusan sebelumnya sebelum menambahkan konteks baru. Tugas ini hanya mengubah dokumentasi.

## Dokumen Sasaran

- `.agent/docs/BRD.md` — konteks dan kebutuhan bisnis.
- `.agent/docs/PRD.md` — kebutuhan produk, termasuk kebutuhan fungsional yang kadang disebut FRD. Gunakan nama PRD yang sudah ditetapkan proyek; jangan membuat `FRD.md` duplikat.
- `.agent/docs/SDD.md` — desain sistem, arsitektur, teknologi, komponen, dan desain database.

## Prosedur

1. Baca `AGENTS.md`, instruksi lokal yang berlaku, lessons yang relevan, dan isi dokumen sasaran. Pertahankan keputusan yang masih berlaku.
2. Petakan codebase yang relevan sebelum menulis: stack dan versinya, entry point, alur utama, antarmuka atau API, modul penting, autentikasi dan otorisasi, integrasi, penyimpanan data, serta konfigurasi dan tes yang membantu mengonfirmasi perilaku. Ikuti package manager dan versi yang dinyatakan oleh project.
3. Jika tersedia dan sesuai instruksi proyek, gunakan skill `codebase-memory` untuk pertanyaan struktural; verifikasi temuan penting pada file sumber.
4. Pisahkan tiga jenis informasi:
   - **Kondisi saat ini**: perilaku dan desain yang terbukti dari codebase atau dokumentasi yang dipercaya.
   - **Keputusan bisnis atau produk**: maksud yang dinyatakan pengguna atau dokumen proyek yang masih berlaku.
   - **Perubahan yang diinginkan**: fitur tambahan atau perubahan yang belum terbukti diimplementasikan. Catat sebagai usulan atau rencana, bukan sebagai perilaku saat ini.
5. Isi dokumen yang kosong dengan informasi yang dapat dipastikan. Untuk dokumen yang sudah berisi, pertahankan konten yang masih berlaku dan ubah hanya bagian yang perlu diperbarui. Jangan menimpa dokumen lengkap dengan ringkasan codebase.
6. Hubungkan perubahan yang diminta dengan keadaan proyek sekarang. Catat dampaknya pada dokumen terkait, termasuk kebutuhan bisnis, perilaku produk, arsitektur, modul, integrasi, atau data. Jangan menganggap fitur baru sudah dibangun.
7. Periksa silang ketiga dokumen agar istilah, cakupan, status fitur, dan keputusan tidak saling bertentangan. Biarkan pertanyaan yang belum terjawab sebagai pertanyaan terbuka; jangan mengarang stakeholder, KPI, aturan bisnis, persona, requirement, atau desain.

## Cakupan Tiap Dokumen

### BRD — Business Requirements Document

Gunakan bagian yang relevan untuk menjelaskan konteks bisnis, masalah, tujuan, stakeholder, kebutuhan dan cakupan bisnis, business rules, KPI atau kriteria sukses, constraints, assumptions, risks, dan dependencies. Codebase biasanya tidak cukup untuk menyimpulkan tujuan bisnis atau KPI; gunakan keputusan yang diberikan pengguna dan dokumen proyek, atau tandai sebagai belum diketahui.

### PRD — Product Requirements Document

Gunakan bagian yang relevan untuk menjelaskan gambaran produk, pengguna atau persona, kebutuhan dan use case, product scope, fitur, user stories, acceptance criteria, alur dan UX, serta functional dan non-functional requirements. Gunakan implementasi untuk mencatat kemampuan yang sudah tersedia; tandai perubahan yang diminta tetapi belum diterapkan sebagai usulan atau rencana.

### SDD — Software Design Document

Gunakan bagian yang relevan untuk menjelaskan batas dan gambaran sistem, arsitektur, technology stack, modul atau komponen beserta tanggung jawab dan dependensinya, serta database design termasuk ERD, tabel, relasi, indeks, dan constraints. Ambil fakta implementasi dari konfigurasi, source code, schema, migrations, models, queries, dan tes yang relevan. Bedakan desain usulan dari desain yang sudah diterapkan.

## Aturan Penulisan dan Riset

- Topik di atas adalah panduan cakupan, bukan daftar heading wajib. Susun dokumen mengikuti bentuk dan kebutuhan proyek; jaga tetap ringkas dan mudah diperbarui.
- Gunakan bahasa dokumen yang sudah ada. Jika semuanya kosong, gunakan bahasa permintaan pengguna.
- Sertakan rujukan file atau artefak codebase untuk keputusan desain teknis yang penting bila membantu pembaca memverifikasinya.
- Jangan melakukan riset web untuk mengisi dokumentasi rutin. Jika pengguna meminta atau memberikan hasil riset, catat sumber dan tanggal serta tandai apakah isinya rekomendasi, keputusan yang disetujui, atau implementasi saat ini.
- Jangan mengubah source code, konfigurasi, dependency, schema, atau tes. Jika menemukan ketidaksesuaian implementasi dengan kebutuhan, dokumentasikan perbedaannya; jangan memperbaikinya dalam tugas ini.

## Kriteria Selesai

- BRD, PRD, dan SDD mencerminkan informasi relevan yang diketahui tentang proyek yang sudah berjalan.
- Fitur yang direncanakan dapat dibedakan dari fitur yang telah diimplementasikan.
- Informasi yang tidak diketahui dinyatakan terbuka, bukan diisi dengan asumsi tanpa dasar.
- Dokumen konsisten satu sama lain dan tidak memuat bagian yang tidak relevan hanya demi melengkapi template.
- Laporkan dokumen yang diubah, ringkasan pembaruan, bukti codebase yang dipakai, serta pertanyaan atau keputusan yang masih terbuka.
