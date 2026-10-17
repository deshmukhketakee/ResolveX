import React from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';

import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/context/AuthContext';

// Customer Pages
import { CustomerDashboard } from '@/pages/customer/CustomerDashboard';
import { SubmitComplaint } from '@/pages/customer/SubmitComplaint';
import { MyComplaints } from '@/pages/customer/MyComplaints';

// Agent Pages
import { AgentDashboard } from '@/pages/agent/AgentDashboard';
import { AssignedComplaints } from '@/pages/agent/AssignedComplaints';
import { InvestigationView } from '@/pages/agent/InvestigationView';

// Admin Pages
import { AdminDashboard } from '@/pages/admin/AdminDashboard';
import { UserManagement } from '@/pages/admin/UserManagement';
import { CategoryManagement } from '@/pages/admin/CategoryManagement';
import { PendingMonitoring } from '@/pages/admin/PendingMonitoring';

// Auth & Fallback Pages
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { NotFound } from '@/pages/NotFound';

const LoadingScreen: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-slate-600">
          Loading ResolveX...
        </p>
      </div>
    </div>
  );
};

const ProtectedRoute: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const RoleRoute: React.FC<{
  allowedRole: 'customer' | 'agent' | 'admin';
  children: React.ReactNode;
}> = ({ allowedRole, children }) => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!profile) {
    return <LoadingScreen />;
  }

  if (profile.role !== allowedRole) {
    if (profile.role === 'admin') {
      return <Navigate to="/admin/dashboard" replace />;
    }

    if (profile.role === 'agent') {
      return <Navigate to="/agent/dashboard" replace />;
    }

    return <Navigate to="/customer/dashboard" replace />;
  }

  return <>{children}</>;
};

export const AppRouter: React.FC = () => {
  const { user, loading, profile } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <BrowserRouter>
      <Routes>

        {/* ========================================================= */}
        {/* PUBLIC AUTH ROUTES                                       */}
        {/* ========================================================= */}

        <Route
          path="/login"
          element={
            user ? (
              <Navigate
                to={
                  profile?.role === 'admin'
                    ? '/admin/dashboard'
                    : profile?.role === 'agent'
                    ? '/agent/dashboard'
                    : '/customer/dashboard'
                }
                replace
              />
            ) : (
              <LoginPage />
            )
          }
        />

        <Route
          path="/register"
          element={
            user ? (
              <Navigate to="/customer/dashboard" replace />
            ) : (
              <RegisterPage />
            )
          }
        />

        {/* ========================================================= */}
        {/* PROTECTED APPLICATION                                    */}
        {/* ========================================================= */}

        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >

          {/* Root */}
          <Route
            path="/"
            element={
              <Navigate
                to={
                  profile?.role === 'admin'
                    ? '/admin/dashboard'
                    : profile?.role === 'agent'
                    ? '/agent/dashboard'
                    : '/customer/dashboard'
                }
                replace
              />
            }
          />

          {/* ===================================================== */}
          {/* CUSTOMER ROUTES                                      */}
          {/* ===================================================== */}

          <Route
            path="/customer/dashboard"
            element={
              <RoleRoute allowedRole="customer">
                <CustomerDashboard />
              </RoleRoute>
            }
          />

          <Route
            path="/customer/submit"
            element={
              <RoleRoute allowedRole="customer">
                <SubmitComplaint />
              </RoleRoute>
            }
          />

          <Route
            path="/customer/complaints"
            element={
              <RoleRoute allowedRole="customer">
                <MyComplaints />
              </RoleRoute>
            }
          />

          {/* ===================================================== */}
          {/* AGENT ROUTES                                         */}
          {/* ===================================================== */}

          <Route
            path="/agent/dashboard"
            element={
              <RoleRoute allowedRole="agent">
                <AgentDashboard />
              </RoleRoute>
            }
          />

          <Route
            path="/agent/assigned"
            element={
              <RoleRoute allowedRole="agent">
                <AssignedComplaints />
              </RoleRoute>
            }
          />

          <Route
            path="/agent/investigation"
            element={
              <RoleRoute allowedRole="agent">
                <InvestigationView />
              </RoleRoute>
            }
          />

          {/* ===================================================== */}
          {/* ADMIN ROUTES                                         */}
          {/* ===================================================== */}

          <Route
            path="/admin/dashboard"
            element={
              <RoleRoute allowedRole="admin">
                <AdminDashboard />
              </RoleRoute>
            }
          />

          <Route
            path="/admin/users"
            element={
              <RoleRoute allowedRole="admin">
                <UserManagement />
              </RoleRoute>
            }
          />

          <Route
            path="/admin/categories"
            element={
              <RoleRoute allowedRole="admin">
                <CategoryManagement />
              </RoleRoute>
            }
          />

          <Route
            path="/admin/pending"
            element={
              <RoleRoute allowedRole="admin">
                <PendingMonitoring />
              </RoleRoute>
            }
          />

          {/* 404 */}
          <Route
            path="*"
            element={<NotFound />}
          />

        </Route>

      </Routes>
    </BrowserRouter>
  );
};