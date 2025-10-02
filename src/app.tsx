import React from 'react'
import ErrorBoundary from './components/ErrorBoundary'
import './app.scss'

interface IProps {
  children?: React.ReactNode
}

const App: React.FC<IProps> = ({ children }) => {
  return (
    <ErrorBoundary>
      {children}
    </ErrorBoundary>
  )
}

export default App