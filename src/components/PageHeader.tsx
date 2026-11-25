export function PageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div>
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="display mt-1 text-3xl">{title}</h1>
      {description ? (
        <p className="mt-2 text-sm text-muted">{description}</p>
      ) : null}
    </div>
  );
}
