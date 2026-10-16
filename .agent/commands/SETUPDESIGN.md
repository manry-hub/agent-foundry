# SETUPDESIGN — Inisialisasi Pedoman Tampilan Proyek Berjalan

Gunakan prompt ini secara manual untuk memahami tampilan aplikasi yang sudah ada dan menginisialisasi atau memperbarui `.agent/rules/DESIGN.md`. Perlakukan proyek sebagai proyek lanjutan: petakan pola yang benar-benar dipakai sebelum memberi arahan visual baru. Tugas ini hanya mengubah dokumentasi, kecuali pengguna secara eksplisit meminta implementasi UI.

## Prosedur

1. Baca `AGENTS.md`, instruksi lokal yang berlaku, `.agent/rules/DESIGN.md`, dan dokumen produk yang relevan. Pertahankan keputusan desain yang masih berlaku.
2. Identifikasi stack frontend, entry point, route atau screen utama, layout, design tokens, stylesheet, komponen bersama, font, ikon, dan aset visual dari codebase. Ikuti versi framework dan package manager yang ditetapkan proyek.
3. Untuk memahami UI secara struktural, gunakan skill `codebase-memory` bila tersedia dan sesuai instruksi proyek; verifikasi temuan penting pada source code.
4. Untuk tugas UI/UX, gunakan skill `impeccable` dan ikuti alur yang cocok untuk audit atau pendokumentasian desain. Jika tidak tersedia, ikuti instruksi instalasi di `AGENTS.md` sebelum bergantung padanya.
5. Bila aplikasi dapat dijalankan atau sudah terbuka, periksa halaman dan state yang relevan dengan Playwright MCP. Gunakan Chrome DevTools MCP untuk memeriksa computed styles atau masalah visual yang sulit dipastikan dari source. Jika proyek memiliki file `.pen` atau pengguna meminta pekerjaan pada Pencil, baca skill Pencil dan gunakan Pencil MCP. Jika tool terkait tidak tersedia, lanjutkan dari source dan aset yang ada, lalu sebutkan keterbatasan pemeriksaan runtime.
6. Catat temuan dalam tiga kelompok yang jelas:
   - **Tampilan saat ini**: pola yang terbukti dari source atau UI yang diamati.
   - **Arahan pengguna**: preferensi atau perubahan visual yang secara eksplisit diminta.
   - **Usulan**: perbaikan visual yang disimpulkan dari audit tetapi belum disetujui atau diterapkan.
7. Isi DESIGN.md yang kosong atau perbarui bagian yang terdampak bila sudah berisi. Jangan menulis ulang preferensi yang masih berlaku dan jangan mengubah kode dalam mode dokumentasi ini.
8. Periksa apakah pedoman hasilnya konsisten dengan komponen, halaman, dan aset yang benar-benar ada. Tandai hal yang belum diketahui; jangan mengarang brand, warna, tipografi, breakpoint, atau keputusan desain.

## Hal yang Perlu Dipetakan

Dokumentasikan hanya yang berguna bagi pekerjaan UI berikutnya, misalnya:

- Prinsip dan karakter visual produk yang terlihat atau telah diputuskan.
- Warna, tipografi, skala spacing, grid, breakpoint, radius, border, elevation, dan motion yang benar-benar digunakan.
- Pola layout, navigasi, komponen bersama, ikonografi, ilustrasi, foto, dan aturan penggunaan aset.
- State komponen seperti hover, focus, active, disabled, loading, empty, error, dan success bila relevan.
- Perilaku responsive, aksesibilitas, kontras, keyboard, dan reduced motion yang telah diterapkan atau diminta.
- Ketidakkonsistenan visual penting beserta lokasi contohnya dan usulan perbaikannya.

Jangan menginventaris semua komponen atau menyalin seluruh nilai CSS. Rujuk file atau komponen sumber untuk detail yang mudah ditemukan di codebase; catat di DESIGN.md keputusan, konvensi, atau hubungan antarpola yang tidak jelas dari source saja.

## Arahan untuk Perubahan Tampilan

- Untuk fitur tambahan, pertahankan pola visual dan perilaku produk yang sudah ada kecuali pengguna meminta arah baru.
- Pisahkan kebutuhan visual fitur yang diminta dari tampilan yang sudah diimplementasikan. Tulis kebutuhan baru sebagai target atau usulan sampai perubahan UI benar-benar dibuat.
- Bila arahan pengguna bertentangan dengan pola lama, catat arahan terbaru sebagai keputusan target dan tandai pola yang perlu diganti; jangan diam-diam memperluas redesign ke halaman lain.
- Jangan menambahkan dependency, mengganti design system, membuat brand baru, atau mengubah alur produk hanya demi konsistensi visual tanpa kebutuhan yang jelas.
- Jika pengguna meminta implementasi UI, kerjakan hanya cakupan visual yang diminta, tetap ikuti arsitektur dan komponen proyek, lalu verifikasi tampilan pada ukuran layar dan state yang relevan bila tool tersedia.

## Kriteria Selesai

- `.agent/rules/DESIGN.md` menjelaskan pola visual yang relevan dan arahan pengguna untuk pengembangan berikutnya.
- Fakta yang diamati, target yang diminta, dan usulan yang belum disetujui dapat dibedakan.
- Pedoman cukup ringkas untuk dipakai saat mengerjakan UI dan tidak memaksa redesign menyeluruh.
- Laporkan file yang diubah, sumber pengamatan (source, route, atau state UI), serta keterbatasan atau keputusan visual yang masih terbuka.
