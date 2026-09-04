import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthGate } from '@/features/auth/AuthGate'
import { SyncProvider } from '@/app/SyncProvider'
import { Shell } from '@/app/Shell'
import DesignPage from '@/features/design/DesignPage'
import { DayPage } from '@/features/day/DayPage'
import { InboxPage } from '@/features/inbox/InboxPage'
import { SettingsPage } from '@/features/settings/SettingsPage'

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/design" element={<DesignPage />} />
        <Route
          element={
            <AuthGate>
              <SyncProvider>
                <Shell />
              </SyncProvider>
            </AuthGate>
          }
        >
          <Route path="/" element={<DayPage />} />
          <Route path="/inbox" element={<InboxPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
