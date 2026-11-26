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
      <h1 className="display display-lg mt-1">{title}</h1>
      {description ? <p className="lede mt-2">{description}</p> : null}
    </div>
  );
}
