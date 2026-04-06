import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { PermissionRoute } from './components/layout/PermissionRoute';
import { AppLayout } from './components/layout/AppLayout';

// Auth
import LoginPage from './pages/auth/LoginPage';

// Core pages
import DashboardPage from './pages/dashboard/DashboardPage';
import DispatchPage from './pages/dispatch/DispatchPage';
import AircraftPage from './pages/aircraft/AircraftPage';
import AircraftAvailabilityPage from './pages/aircraft-availability/AircraftAvailabilityPage';
import RosterPage from './pages/roster/RosterPage';
import FleetPage from './pages/fleet/FleetPage';
import CompliancePage from './pages/compliance/CompliancePage';
import FinancePage from './pages/finance/FinancePage';
import CrmPage from './pages/crm/CrmPage';
import SupportPage from './pages/support/SupportPage';
import TrainingPage from './pages/training/TrainingPage';
import ReportsPage from './pages/reports/ReportsPage';
import AdminPage from './pages/admin/AdminPage';
import AdminSettingsPage from './pages/admin/AdminSettingsPage';
import RolesPage from './pages/admin/RolesPage';
import UsersPage from './pages/admin/UsersPage';

// Students & Instructors
import StudentsPage from './pages/students/StudentsPage';
import StudentDetailPage from './pages/students/StudentDetailPage';
import InstructorsPage from './pages/instructors/InstructorsPage';
import InstructorDetailPage from './pages/instructors/InstructorDetailPage';

// Misc
import ForbiddenPage from './pages/ForbiddenPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/403" element={<ForbiddenPage />} />

        {/* Protected – requires valid JWT */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />

            {/* Dashboard */}
            <Route element={<PermissionRoute permission="dashboard:read" />}>
              <Route path="dashboard" element={<DashboardPage />} />
            </Route>

            {/* Dispatch */}
            <Route element={<PermissionRoute permission="dispatch:read" />}>
              <Route path="dispatch/*" element={<DispatchPage />} />
            </Route>

            {/* Aircraft Management */}
            <Route element={<PermissionRoute permission="fleet:read" />}>
              <Route path="aircraft" element={<AircraftPage />} />
            </Route>

            {/* Aircraft Availability */}
            <Route element={<PermissionRoute permission="aircraft_availability:read" />}>
              <Route path="aircraft-availability" element={<AircraftAvailabilityPage />} />
            </Route>

            {/* Roster */}
            <Route element={<PermissionRoute permission="roster:read" />}>
              <Route path="roster/*" element={<RosterPage />} />
            </Route>

            {/* Students */}
            <Route element={<PermissionRoute permission="students:read" />}>
              <Route path="students" element={<StudentsPage />} />
              <Route path="students/:profileId" element={<StudentDetailPage />} />
            </Route>

            {/* Instructors */}
            <Route element={<PermissionRoute permission="instructors:read" />}>
              <Route path="instructors" element={<InstructorsPage />} />
              <Route path="instructors/:instructorId" element={<InstructorDetailPage />} />
            </Route>

            {/* Fleet */}
            <Route element={<PermissionRoute permission="fleet:read" />}>
              <Route path="fleet/*" element={<FleetPage />} />
            </Route>

            {/* Compliance */}
            <Route element={<PermissionRoute permission="compliance:read" />}>
              <Route path="compliance/*" element={<CompliancePage />} />
            </Route>

            {/* Finance */}
            <Route element={<PermissionRoute permission="finance:read" />}>
              <Route path="finance/*" element={<FinancePage />} />
            </Route>

            {/* CRM */}
            <Route element={<PermissionRoute permission="crm:read" />}>
              <Route path="crm/*" element={<CrmPage />} />
            </Route>

            {/* Support */}
            <Route element={<PermissionRoute permission="support:read" />}>
              <Route path="support/*" element={<SupportPage />} />
            </Route>

            {/* Training */}
            <Route element={<PermissionRoute permission="training:read" />}>
              <Route path="training/*" element={<TrainingPage />} />
            </Route>

            {/* Reports */}
            <Route element={<PermissionRoute permission="reports:read" />}>
              <Route path="reports/*" element={<ReportsPage />} />
            </Route>

            {/* Admin */}
            <Route element={<PermissionRoute anyOf={['admin:roles_read', 'admin:users_read', 'admin:tenant_settings']} />}>
              <Route path="admin" element={<AdminPage />} />
              <Route path="admin/settings" element={<AdminSettingsPage />} />
              <Route element={<PermissionRoute permission="admin:roles_read" />}>
                <Route path="admin/roles" element={<RolesPage />} />
              </Route>
              <Route element={<PermissionRoute permission="admin:users_read" />}>
                <Route path="admin/users" element={<UsersPage />} />
              </Route>
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AuthProvider>
  );
}
