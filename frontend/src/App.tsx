import React, { useEffect, useState, useRef, useCallback } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuthStore } from './hooks/useAuth';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useInactivityLogout } from './hooks/useInactivityLogout';
import { LoginPage } from './pages/LoginPage';
import { UserCreatePage } from './pages/UserCreatePage';
import { BattalionImportPage } from './pages/BattalionImportPage';
import { BattalionCreatePage } from './pages/BattalionCreatePage';
import { BattalionAllocatePage } from './pages/BattalionAllocatePage';
import { BattalionSoldierPage } from './pages/BattalionSoldierPage';
import { MailingListPage } from './pages/MailingListPage';
import { LogsPage } from './pages/LogsPage';
import { DashboardPage } from './pages/DashboardPage';
import { HomePage } from './pages/HomePage';
import { BenefitsPage } from './pages/BenefitsPage';
import { OpenCallsPage } from './pages/OpenCallsPage';
import { PersonalAreaPage } from './pages/PersonalAreaPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { BackupPage } from './pages/BackupPage';
import { authService } from './services/authService';
import { ChatBot } from './components/ChatBot';
import './index.css';

const NavLink: React.FC<{ to: string; onClick: () => void; children: React.ReactNode }> = ({ to, onClick, children }) => (
  <Link
    to={to}
    onClick={onClick}
    className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-gray-300 hover:bg-gray-700/70 hover:text-white border border-transparent hover:border-gray-600/50 transition-all duration-200"
  >
    {children}
  </Link>
);

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, clearAuth } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleLogout = useCallback(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setShowWarning(false);
    authService.logout();
    clearAuth();
    navigate('/login');
  }, [clearAuth, navigate]);

  const handleWarning = useCallback(() => {
    setCountdown(60);
    setShowWarning(true);
    countdownRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }, []);

  const handleReset = useCallback(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setShowWarning(false);
    setCountdown(60);
  }, []);

  useInactivityLogout({
    onWarning: handleWarning,
    onLogout: handleLogout,
    onReset: handleReset,
    enabled: !!user,
  });

  const closeMenu = () => setSidebarOpen(false);

  const hideSidebar = !user || location.pathname === '/login';

  if (hideSidebar) {
    return <main>{children}</main>;
  }

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="p-5 border-b border-gray-700">
        <h1 className="text-base font-bold leading-tight text-cyan-300 text-center">
          חמל העורף
          <br />
          <span className="text-xs font-normal text-gray-400">מערכת מידע</span>
        </h1>
        {user && (
          <div className="mt-3 text-center">
            <p className="text-sm font-medium text-gray-200 leading-tight">
              {user.firstName} {user.lastName}
            </p>
            <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
              user.role === 'admin' ? 'bg-red-900/60 text-red-300' :
              user.role === 'super' ? 'bg-purple-900/60 text-purple-300' :
              user.role === 'manager' ? 'bg-blue-900/60 text-blue-300' :
              'bg-gray-700/60 text-gray-300'
            }`}>
              {{ admin: 'מנהל מערכת', super: 'סופרוויזר', manager: 'דרג פיקודי', staff: 'צוות' }[user.role]}
            </span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {/* All roles except manager */}
        {user.role !== 'manager' && (
          <NavLink to="/personal-area" onClick={closeMenu}>
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            אזור אישי 360
          </NavLink>
        )}

        {/* Super + Admin + Manager — הקצאת חיילים */}
        {(user.role === 'super' || user.role === 'admin' || user.role === 'manager') && (
          <NavLink to="/battalion/allocate" onClick={closeMenu}>
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            הקצאת חיילים
          </NavLink>
        )}

        {/* Manager links */}
        {user.role === 'manager' && (
          <>
            <NavLink to="/dashboard" onClick={closeMenu}>
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              לוח נתונים
            </NavLink>

            <NavLink to="/battalion/soldier" onClick={closeMenu}>
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              חיפוש חייל
            </NavLink>

            <NavLink to="/battalion/import" onClick={closeMenu}>
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              יבוא גדוד
            </NavLink>

            <NavLink to="/benefits" onClick={closeMenu}>
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 8c1.657 0 3-1.343 3-3S13.657 2 12 2 9 3.343 9 5s1.343 3 3 3zm6 4a2 2 0 00-2-2h-1.172a3 3 0 01-5.656 0H8a2 2 0 00-2 2v7a3 3 0 003 3h6a3 3 0 003-3v-7z" />
              </svg>
              מיצוי זכויות
            </NavLink>

            <NavLink to="/mailing" onClick={closeMenu}>
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              שליחה לרשימת תפוצה
            </NavLink>
          </>
        )}

        {/* Admin only */}
        {user.role === 'admin' && (
          <>
            <NavLink to="/" onClick={closeMenu}>
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2z" />
              </svg>
              דף הבית
            </NavLink>

            <NavLink to="/benefits" onClick={closeMenu}>
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 8c1.657 0 3-1.343 3-3S13.657 2 12 2 9 3.343 9 5s1.343 3 3 3zm6 4a2 2 0 00-2-2h-1.172a3 3 0 01-5.656 0H8a2 2 0 00-2 2v7a3 3 0 003 3h6a3 3 0 003-3v-7z" />
              </svg>
              מיצוי זכויות
            </NavLink>

            <NavLink to="/open-calls" onClick={closeMenu}>
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              פתח קריאה
            </NavLink>

            <NavLink to="/battalion/import" onClick={closeMenu}>
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              יבוא גדוד
            </NavLink>

            <NavLink to="/battalion/create" onClick={closeMenu}>
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 4v16m8-8H4" />
              </svg>
              הוספת גדוד
            </NavLink>

            <NavLink to="/battalion/soldier" onClick={closeMenu}>
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              חיפוש חייל
            </NavLink>

            <NavLink to="/dashboard" onClick={closeMenu}>
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              לוח נתונים
            </NavLink>

            <NavLink to="/mailing" onClick={closeMenu}>
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              שליחה לרשימת תפוצה
            </NavLink>

            <NavLink to="/users/new" onClick={closeMenu}>
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              ניהול משתמשים
            </NavLink>

            <NavLink to="/logs" onClick={closeMenu}>
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              לוגי מערכת
            </NavLink>

            <NavLink to="/backup" onClick={closeMenu}>
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              גיבוי DB
            </NavLink>
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
    </>
  );

  return (
    <div className="flex min-h-screen" dir="rtl">
      {/* Desktop sidebar — always visible on md+ */}
      <aside className="hidden md:flex w-56 bg-gray-900 text-white flex-col flex-shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-60 z-20 md:hidden"
          onClick={closeMenu}
        />
      )}

      {/* Mobile sidebar — slides in from right */}
      <aside
        className={`fixed top-0 right-0 h-full w-64 bg-gray-900 text-white flex flex-col z-30 transform transition-transform duration-300 md:hidden
          ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Close button */}
        <button
          onClick={closeMenu}
          className="absolute top-3 left-3 text-gray-400 hover:text-white p-1"
          aria-label="סגור תפריט"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        {sidebarContent}
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-700">
          <span className="text-cyan-300 font-bold text-sm">חמל העורף</span>
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-300 hover:text-white p-1"
            aria-label="פתח תפריט"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </header>

        <main className="flex-1 bg-gray-800 overflow-auto" dir="rtl">
          {children}
        </main>
      </div>

      <ChatBot />

      {/* Inactivity warning modal */}
      {showWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center" dir="rtl">
          <div className="bg-gray-900 border border-yellow-500/60 rounded-xl p-8 max-w-sm w-full mx-4 text-center shadow-2xl">
            <div className="text-5xl mb-4">⏳</div>
            <h2 className="text-xl font-bold text-yellow-400 mb-2">אין פעילות</h2>
            <p className="text-gray-300 mb-1 text-sm">המערכת תנתק אותך בעוד</p>
            <p className="text-5xl font-mono font-bold text-yellow-300 my-4">{countdown}</p>
            <p className="text-gray-400 text-sm mb-6">שניות</p>
            <button
              onClick={handleReset}
              className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg transition-colors text-base"
            >
              אני עדיין כאן
            </button>
          </div>
        </div>
      )}
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
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route
            path="/users/new"
            element={
              <ProtectedRoute>
                <UserCreatePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/battalion/allocate"
            element={
              <ProtectedRoute>
                <BattalionAllocatePage />
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
            path="/battalion/create"
            element={
              <ProtectedRoute>
                <BattalionCreatePage />
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
          <Route
            path="/benefits"
            element={
              <ProtectedRoute>
                <BenefitsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/open-calls"
            element={
              <ProtectedRoute>
                <OpenCallsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/personal-area"
            element={
              <ProtectedRoute>
                <PersonalAreaPage />
              </ProtectedRoute>
            }
          />
          <Route path="/backup" element={<ProtectedRoute><BackupPage /></ProtectedRoute>} />
          <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
