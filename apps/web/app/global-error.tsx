"use client";

/** Cadangan terakhir bila layout utama ikut gagal — tanpa komponen lain. */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="id">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0 }}>
        <main
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            padding: 24,
            textAlign: "center",
          }}
        >
          <h1 style={{ fontSize: 20, margin: 0 }}>Aplikasi sedang bermasalah</h1>
          <p style={{ color: "#555", margin: 0, maxWidth: 360 }}>
            Coba muat ulang halaman. Jika masih terjadi, hubungi admin.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{ padding: "10px 18px", borderRadius: 8, border: "none", background: "#e8590c", color: "#fff", fontSize: 15 }}
          >
            Muat ulang
          </button>
        </main>
      </body>
    </html>
  );
}
