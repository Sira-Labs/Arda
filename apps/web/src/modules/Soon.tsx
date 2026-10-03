/** A destination that is specified but not built yet; says what it will be. */
export function Soon({ title, children }: { title: string; children: string }) {
  return (
    <div className="stack" style={{ maxWidth: 640 }}>
      <p className="eyebrow">In Arbeit</p>
      <h1>{title}</h1>
      <p className="muted">{children}</p>
    </div>
  );
}
