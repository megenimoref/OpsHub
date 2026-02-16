import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from './hooks/useAuth';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { PeoplePage } from './pages/PeoplePage';
import { PersonCreatePage } from './pages/PersonCreatePage';
import { PersonEditPage } from './pages/PersonEditPage';
import { TicketCreatePage } from './pages/TicketCreatePage';
import { UserCreatePage } from './pages/UserCreatePage';
import { BattalionImportPage } from './pages/BattalionImportPage';
import { BattalionSoldierPage } from './pages/BattalionSoldierPage';
import { MailingListPage } from './pages/MailingListPage';
import { LogsPage } from './pages/LogsPage';
import { authService } from './services/authService';
import './index.css';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const { user, clearAuth } = useAuthStore();

  const handleLogout = () => {
    authService.logout();
    clearAuth();
    navigate('/login');
  };

  if (!user) {
    return <main>{children}</main>;
  }

  return (
    <div className="flex min-h-screen" dir="rtl">
      {/* Sidebar */}
      <aside className="w-56 bg-gray-900 text-white flex flex-col flex-shrink-0">
        {/* Logo */}
        <div className="p-5 border-b border-gray-700">
          <h1 className="text-base font-bold leading-tight text-cyan-300 text-center">
            חמל העורף
            <br />
            <span className="text-xs font-normal text-gray-400">מערכת מידע</span>
          </h1>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          <Link
            to="/people"
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-gray-200 hover:bg-gray-700 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            אנשי קשר
          </Link>

          <Link
            to="/tickets/new"
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-gray-200 hover:bg-gray-700 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            פתח קריאה
          </Link>

          <Link
            to="/battalion/import"
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-gray-200 hover:bg-gray-700 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            יבוא גדוד
          </Link>

          <Link
            to="/battalion/soldier"
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-gray-200 hover:bg-gray-700 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            חיפוש חייל
          </Link>

          <Link
            to="/mailing"
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-gray-200 hover:bg-gray-700 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            שליחה לרשימת תפוצה
          </Link>

          {user.role === 'admin' && (
            <>
              <Link
                to="/users/new"
                className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-gray-200 hover:bg-gray-700 hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                הכנס משתמש חדש
              </Link>
              <Link
                to="/logs"
                className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-gray-200 hover:bg-gray-700 hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                לוגי מערכת
              </Link>
            </>
          )}
        </nav>

        {/* User info + Logout */}
        <div className="p-4 border-t border-gray-700">
          <p className="text-xs text-gray-400 mb-3 text-center truncate">{user.email}</p>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-gray-200 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            התנתק
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 bg-gray-800 overflow-auto" dir="rtl">
        {children}
      </main>
    </div>
  );
};

function App() {
  const { initFromStorage } = useAuthStore();

  useEffect(() => {
    initFromStorage();
  }, []);

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/people"
            element={
              <ProtectedRoute>
                <PeoplePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/people/new"
            element={
              <ProtectedRoute>
                <PersonCreatePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/people/:id"
            element={
              <ProtectedRoute>
                <PersonEditPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tickets/new"
            element={
              <ProtectedRoute>
                <TicketCreatePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users/new"
            element={
              <ProtectedRoute>
                <UserCreatePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/battalion/import"
            element={
              <ProtectedRoute>
                <BattalionImportPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/battalion/soldier"
            element={
              <ProtectedRoute>
                <BattalionSoldierPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mailing"
            element={
              <ProtectedRoute>
                <MailingListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/logs"
            element={
              <ProtectedRoute>
                <LogsPage />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/people" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
