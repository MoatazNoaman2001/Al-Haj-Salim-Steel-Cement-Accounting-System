"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html dir="rtl" lang="ar">
      <body>
        <div style={{ padding: "2rem", textAlign: "center" }}>
          <h2>حدث خطأ غير متوقع</h2>
          <button onClick={() => reset()}>حاول مرة أخرى</button>
        </div>
      </body>
    </html>
  );
}
