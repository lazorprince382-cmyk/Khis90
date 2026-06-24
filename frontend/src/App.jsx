import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import { pageLoaders } from './routes/pageLoaders';

const Login = lazy(pageLoaders.login);
const RegisterLearner = lazy(pageLoaders.register);
const BulkImport = lazy(pageLoaders.bulkImport);
const AllStudents = lazy(pageLoaders.students);
const QrCodes = lazy(pageLoaders.qrCodes);
const LearnerLookup = lazy(pageLoaders.lookup);
const ScanGate = lazy(pageLoaders.scanGate);
const ScanLunch = lazy(pageLoaders.scanLunch);
const ScanLibrary = lazy(pageLoaders.scanLibrary);
const Notifications = lazy(pageLoaders.notifications);
const Settings = lazy(pageLoaders.settings);
const Reports = lazy(pageLoaders.reports);
const Visitors = lazy(pageLoaders.visitors);
const StaffPage = lazy(pageLoaders.staff);
const OfficeDashboard = lazy(pageLoaders.officeDashboard);
const OfficeManagement = lazy(pageLoaders.offices);
const Messages = lazy(pageLoaders.messages);

function PageFallback() {
  return <div className="page-loading">Loading...</div>;
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) return <div style={{ padding: '4rem', textAlign: 'center' }}>Loading...</div>;

  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<ProtectedRoute path="/"><Dashboard /></ProtectedRoute>} />
          <Route path="register" element={<ProtectedRoute path="/register"><RegisterLearner /></ProtectedRoute>} />
          <Route path="bulk-import" element={<ProtectedRoute path="/bulk-import"><BulkImport /></ProtectedRoute>} />
          <Route path="students" element={<ProtectedRoute path="/students"><AllStudents /></ProtectedRoute>} />
          <Route path="qr-codes" element={<ProtectedRoute path="/qr-codes"><QrCodes /></ProtectedRoute>} />
          <Route path="lookup" element={<ProtectedRoute path="/lookup"><LearnerLookup /></ProtectedRoute>} />
          <Route path="scan/gate" element={<ProtectedRoute path="/scan/gate"><ScanGate /></ProtectedRoute>} />
          <Route path="scan/lunch" element={<ProtectedRoute path="/scan/lunch"><ScanLunch /></ProtectedRoute>} />
          <Route path="scan/library" element={<ProtectedRoute path="/scan/library"><ScanLibrary /></ProtectedRoute>} />
          <Route path="notifications" element={<ProtectedRoute path="/notifications"><Notifications /></ProtectedRoute>} />
          <Route path="settings" element={<ProtectedRoute path="/settings"><Settings /></ProtectedRoute>} />
          <Route path="reports" element={<ProtectedRoute path="/reports"><Reports /></ProtectedRoute>} />
          <Route path="visitors" element={<ProtectedRoute path="/visitors"><Visitors /></ProtectedRoute>} />
          <Route path="staff" element={<ProtectedRoute path="/staff"><StaffPage /></ProtectedRoute>} />
          <Route path="office-dashboard" element={<ProtectedRoute path="/office-dashboard"><OfficeDashboard /></ProtectedRoute>} />
          <Route path="offices" element={<ProtectedRoute path="/offices"><OfficeManagement /></ProtectedRoute>} />
          <Route path="messages" element={<ProtectedRoute path="/messages"><Messages /></ProtectedRoute>} />
        </Route>
      </Routes>
    </Suspense>
  );
}
