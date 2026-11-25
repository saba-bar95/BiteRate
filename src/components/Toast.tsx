export function Toast({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <div className="fixed right-4 bottom-4 z-50 rounded-md border border-emerald/25 bg-panel px-4 py-3 text-sm text-emerald shadow-lg fade-in">
      {message}
    </div>
  )
}
