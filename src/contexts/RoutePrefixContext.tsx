import { createContext, useContext } from 'react'

const RoutePrefixContext = createContext('')

// eslint-disable-next-line react-refresh/only-export-components
export function useRoutePrefix() {
  return useContext(RoutePrefixContext)
}

export function RoutePrefixProvider({
  prefix,
  children,
}: {
  prefix: string
  children: React.ReactNode
}) {
  return (
    <RoutePrefixContext.Provider value={prefix}>
      {children}
    </RoutePrefixContext.Provider>
  )
}
