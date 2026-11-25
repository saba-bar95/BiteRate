import { useEffect } from 'react'

export function usePageTitle(title: string) {
  useEffect(() => {
    const previous = document.title
    document.title = title.includes('BiteRate') ? title : `BiteRate — ${title}`
    return () => {
      document.title = previous
    }
  }, [title])
}
