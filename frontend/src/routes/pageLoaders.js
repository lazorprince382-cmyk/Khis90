export const pageLoaders = {
  login: () => import('../pages/Login'),
  register: () => import('../pages/RegisterLearner'),
  bulkImport: () => import('../pages/BulkImport'),
  students: () => import('../pages/AllStudents'),
  qrCodes: () => import('../pages/QrCodes'),
  lookup: () => import('../pages/LearnerLookup'),
  scanGate: () => import('../pages/ScanGate'),
  scanLunch: () => import('../pages/ScanLunch'),
  scanLibrary: () => import('../pages/ScanLibrary'),
  notifications: () => import('../pages/Notifications'),
  settings: () => import('../pages/Settings'),
  reports: () => import('../pages/Reports'),
  visitors: () => import('../pages/Visitors'),
  staff: () => import('../pages/StaffPage'),
  officeDashboard: () => import('../pages/OfficeDashboard'),
  offices: () => import('../pages/OfficeManagement'),
};

const routeLoaders = {
  '/register': pageLoaders.register,
  '/bulk-import': pageLoaders.bulkImport,
  '/students': pageLoaders.students,
  '/qr-codes': pageLoaders.qrCodes,
  '/lookup': pageLoaders.lookup,
  '/scan/gate': pageLoaders.scanGate,
  '/scan/lunch': pageLoaders.scanLunch,
  '/scan/library': pageLoaders.scanLibrary,
  '/notifications': pageLoaders.notifications,
  '/settings': pageLoaders.settings,
  '/reports': pageLoaders.reports,
  '/visitors': pageLoaders.visitors,
  '/staff': pageLoaders.staff,
  '/office-dashboard': pageLoaders.officeDashboard,
  '/offices': pageLoaders.offices,
};

const preloadedRoutes = new Set();

export function preloadRoute(path) {
  const loader = routeLoaders[path];
  if (!loader || preloadedRoutes.has(path)) return;
  preloadedRoutes.add(path);
  loader().catch(() => preloadedRoutes.delete(path));
}
