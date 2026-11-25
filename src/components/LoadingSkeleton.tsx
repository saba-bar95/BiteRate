export function LoadingSkeleton() {
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="skeleton h-80" />
        <div className="skeleton h-80" />
      </div>
      <div className="skeleton h-52" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton h-36" />
        ))}
      </div>
    </div>
  );
}
