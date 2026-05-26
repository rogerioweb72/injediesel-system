import { createContext, useContext, useState, type ReactNode } from 'react'

interface PageHeaderState {
  title?: string
  subtitle?: string
}

interface PageHeaderContextValue {
  state: PageHeaderState
  setPageHeader: (s: PageHeaderState) => void
  clearPageHeader: () => void
}

const PageHeaderContext = createContext<PageHeaderContextValue>({
  state: {},
  setPageHeader: () => {},
  clearPageHeader: () => {},
})

export function PageHeaderProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PageHeaderState>({})

  function setPageHeader(s: PageHeaderState) {
    setState(s)
  }

  function clearPageHeader() {
    setState({})
  }

  return (
    <PageHeaderContext.Provider value={{ state, setPageHeader, clearPageHeader }}>
      {children}
    </PageHeaderContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePageHeaderContext() {
  return useContext(PageHeaderContext)
}
