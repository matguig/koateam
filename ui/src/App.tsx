import { useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { EmployeeDrawer } from './components/EmployeeDrawer'
import { TasksScreen } from './screens/TasksScreen'
import { OrgScreen } from './screens/OrgScreen'
import { InboxScreen } from './screens/InboxScreen'
import { AuditScreen } from './screens/AuditScreen'
import { AccountingScreen } from './screens/AccountingScreen'
import { FoundationScreen } from './screens/FoundationScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import type { Screen } from './types'

export default function App() {
  const [tab, setTab] = useState<Screen>('taches')
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [openEmployee, setOpenEmployee] = useState<string | null>(null)

  return (
    <div data-theme={theme} style={{
      height: '100vh', minWidth: 1100, display: 'flex', background: 'var(--bg)',
      color: 'var(--text)', overflow: 'hidden', fontSize: 13,
    }}>
      <Sidebar
        tab={tab}
        theme={theme}
        onNavigate={setTab}
        onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        onOpenCeo={() => setOpenEmployee('lea')}
      />
      <main style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
        {tab === 'taches' && <TasksScreen />}
        {tab === 'org' && <OrgScreen onOpenEmployee={setOpenEmployee} />}
        {tab === 'inbox' && <InboxScreen />}
        {tab === 'audit' && <AuditScreen />}
        {tab === 'compta' && <AccountingScreen />}
        {tab === 'fondation' && <FoundationScreen />}
        {tab === 'reglages' && <SettingsScreen />}
      </main>
      {openEmployee && <EmployeeDrawer empId={openEmployee} onClose={() => setOpenEmployee(null)} />}
    </div>
  )
}
