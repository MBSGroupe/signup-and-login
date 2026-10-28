import { lazy } from "react";
import { Routes, Route } from "react-router-dom";

// Every page except the login screen is code-split: it downloads when first
// visited (see PageOutlet for the loader / error boundary).
import MainLayout from './Layouts/MainLayout';
import AuthLayout from './Layouts/AuthLayout';
import DashLayout from './Layouts/DashLayout';

import ProtectedRoute from './Layouts/ProtectedRoute';
import AdminRoute from './Layouts/AdminRoute';
const ResetAdminPassword = lazy(() => import("./Pages/DashBoard/Admins/ResetAdminPassword"));
const ChangeAdminRole = lazy(() => import("./Pages/DashBoard/Admins/ChangeAdminRole"));
const ChangePassword = lazy(() => import("./Pages/DashBoard/Users/changePassword"));
import LoginForm from './Pages/Login';
const FormulaireCNOA = lazy(() => import("./Pages/Sign-up"));
const SignupClosed = lazy(() => import("./Pages/SignupClosed"));
const ProfilePage = lazy(() => import("./Pages/ProfilePage"));
const OnboardingPage = lazy(() => import("./Pages/OnboardingPage"));
const VerifyPage = lazy(() => import("./Pages/VerificationPage"));
const VerifyPendingPage = lazy(() => import("./Pages/VerifyPending"));
const NotificationsPage = lazy(() => import("./Pages/NotificationPage"));
const PreferencesPage = lazy(() => import("./Pages/PreferencesPage"));
const VerifyDegree = lazy(() => import("./Pages/DashBoard/EtatsDeSortie/VerificationPage"));
const AdminDashboard = lazy(() => import("./Pages/DashBoard/Admin Dashboard"));
const GetUsers = lazy(() => import("./Pages/DashBoard/Users/getUsers"));
const CreateUser = lazy(() => import("./Pages/DashBoard/Users/createUser"));
const UpdateUser = lazy(() => import("./Pages/DashBoard/Users/updateUser"));
const EditCotisation = lazy(() => import("./Pages/DashBoard/Cotisations/EditCotisation"));
const DeleteItem = lazy(() => import("./Components/deleteItem"));
const AdminUserView = lazy(() => import("./Pages/DashBoard/Users/AdminView/AdminUserView"));
const GetCotisations = lazy(() => import("./Pages/DashBoard/Cotisations/getCotisations"));
const FeeStats = lazy(() => import("./Pages/DashBoard/Stats/FeeStats"));
const UserStats = lazy(() => import("./Pages/DashBoard/Stats/UserStats"));
const ValidationStats = lazy(() => import("./Pages/DashBoard/Stats/ValidationStats"));
const CreateBulkCotisation = lazy(() => import("./Pages/DashBoard/Cotisations/CreateBulkCotisations"));
const PermissionManager = lazy(() => import("./Pages/DashBoard/Permissions/PermissionConfig"));
const PermissionDetails = lazy(() => import("./Pages/DashBoard/Permissions/getSchema"));
const NewVersion = lazy(() => import("./Pages/DashBoard/Permissions/createVersion"));
const EditVersion = lazy(() => import("./Pages/DashBoard/Permissions/EditVersion"));
const ValidationRequestDetail = lazy(() => import("./Pages/DashBoard/Validations/ValidationRequestsDetail"));
const ValidationRequestsList = lazy(() => import("./Pages/DashBoard/Validations/ValidationRequestsList"));
const ValidationSchemasList = lazy(() => import("./Pages/DashBoard/Validations/ValidationSchemasAdmin"));
const NewValidationSchema = lazy(() => import("./Pages/DashBoard/Validations/NewValidationSchema"));
const EditValidationSchema = lazy(() => import("./Pages/DashBoard/Validations/EditValidationSchema"));
const ValidationSchemaVersions = lazy(() => import("./Pages/DashBoard/Validations/ValidationSchemasVersions"));
const AllValidationRequests = lazy(() => import("./Pages/DashBoard/Validations/allValidationRequests"));
const MyValidationRequests = lazy(() => import("./Pages/DashBoard/Validations/MyValidationRequests"));
const ValidationSchemaDetails = lazy(() => import("./Pages/DashBoard/Validations/ValidationSchemaDetails"));
const ValidationRequestProgress = lazy(() => import("./Pages/DashBoard/Validations/ValidationRequestsProgress"));
const AdminsPanel = lazy(() => import("./Pages/DashBoard/Admins/AdminsPanel"));
const AdminForm = lazy(() => import("./Pages/DashBoard/Admins/AdminForm"));
const AdminProfile = lazy(() => import("./Pages/DashBoard/Admins/AdminsProfile"));
const AdminLogin = lazy(() => import("./Pages/adminLogin"));
const RoleDetails = lazy(() => import("./Pages/DashBoard/Roles/RoleDetails"));
const RolesPanel = lazy(() => import("./Pages/DashBoard/Roles/RolesPanel"));
const RoleForm = lazy(() => import("./Pages/DashBoard/Roles/RoleForm"));
const BackgroundManager = lazy(() => import("./Pages/DashBoard/EtatsDeSortie/BackgroundManager"));
const ForgotPassword = lazy(() => import("./Pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./Pages/ResetPassword"));
const SiteApplication = lazy(() => import("./Pages/siteapplication"));

import NotFound from "./Pages/NotFound";
const AdminStats = lazy(() => import("./Pages/DashBoard/Stats/AdminStats"));
const ExportsPage = lazy(() => import("./Pages/DashBoard/Exports/ExportsPage"));
const MyExportsPage = lazy(() => import("./Pages/DashBoard/Exports/MyExportsPage"));

// Signup can be closed per environment with VITE_SIGNUP_ENABLED=false (open by default)
const SIGNUP_ENABLED = import.meta.env.VITE_SIGNUP_ENABLED !== 'false';

export default function App() {
  return (
    <Routes>

      {/* PUBLIC / MAIN LAYOUT */}
      <Route path="/" element={<MainLayout />}>
        <Route index element={<LoginForm />} />
        <Route path="signup" element={SIGNUP_ENABLED ? <FormulaireCNOA /> : <SignupClosed />} />
        <Route path="adminlogin" element={<AdminLogin />} />

        
        <Route path="forgot-password" element={<ForgotPassword />} />
        <Route path="admin/forgot-password" element={<ForgotPassword admin />} />
        <Route path="reset-password" element={<ResetPassword />} />
        <Route path="application-mobile" element={<SiteApplication />} />
         <Route path="verify/degree/:token" element={<VerifyDegree />} />
        <Route path="verify-pending" element={<VerifyPendingPage />} />
        <Route path="verify" element={<VerifyPage />} />
      </Route>

      {/* AUTH LAYOUT (logged in pages) */}
      <Route path="/auth" element={<AuthLayout />}>

        <Route path="notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
        <Route path="preferences" element={<ProtectedRoute><PreferencesPage /></ProtectedRoute>} />
        <Route path="profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="update/:id" element={<ProtectedRoute><UpdateUser /></ProtectedRoute>} />
        <Route path="edit/fee/:id" element={<ProtectedRoute><EditCotisation /></ProtectedRoute>} />
        <Route path="onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />
        <Route path="change-password" element={<ProtectedRoute>< ChangePassword/></ProtectedRoute>} />


      </Route>

      {/* DASHBOARD / ADMIN LAYOUT */}
      <Route path="/dash" element={<AdminRoute><DashLayout /></AdminRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="allUsers" element={<GetUsers mode="users" />} />
        <Route path="allMembers" element={<GetUsers mode="membres" />} />
        <Route path="allCotisations" element={<GetCotisations/>} />
        <Route path="createUser" element={<CreateUser/>} />
        <Route path="ajouterCotisation" element={<CreateBulkCotisation />} />


        <Route path="admins" element={<AdminsPanel />} />
        <Route path="/dash/admins/create"   element={<AdminForm mode="create" />} />
        <Route path="/dash/admins/edit/:id" element={<AdminForm mode="edit" />} />
        <Route path="/dash/admins/:id" element={<AdminProfile mode="edit" />} />
        <Route path="/dash/admins/:id/reset-password" element={<ResetAdminPassword />} />
        <Route path="/dash/admins/:id/change-role" element={<ChangeAdminRole />} />



        <Route path="/dash/roles"           element={<RolesPanel />} />
        <Route path="/dash/roles/create"    element={<RoleForm mode="create" />} />
        <Route path="/dash/roles/edit/:id"  element={<RoleForm mode="edit" />} />
        <Route path="/dash/roles/:id"       element={<RoleDetails />} />
        
        <Route path="permissions" element={<PermissionManager />} />
        <Route path="permissions/:model/:versionId" element={<PermissionDetails />} />
        <Route path="permissions/new/:model" element={<NewVersion />} />
        <Route path="permissions/edit/:versionId" element={<EditVersion />} />

        <Route path="validation/requests" element={<ValidationRequestsList />} />
        <Route path="validation/all-requests" element={<AllValidationRequests />} />
        <Route path="validation/my-requests" element={<MyValidationRequests />} />
        <Route path="validation/requests/:id" element={<ValidationRequestDetail />} />
        
        <Route path="validation/schemas" element={<ValidationSchemasList />} />
        <Route path="validation/schemas/new" element={<NewValidationSchema />} />
        <Route path="validation/schemas/:schemaId/edit" element={<EditValidationSchema />} />
        <Route path="validation/schemas/:schemaId/versions" element={<ValidationSchemaVersions />} />
        <Route path="validation/schemas/:schemaId" element={<ValidationSchemaDetails />} />
        <Route path="validation/progress/:id" element={<ValidationRequestProgress />} />
        <Route path="template/background" element={< BackgroundManager/>} />
       

        <Route path="delete/:id" element={<DeleteItem mode='user' />} />
        <Route path="cancel/fee/:id" element={<DeleteItem mode='cotisation' />} />
        <Route path="adminUser/:id" element={<AdminUserView />} />
        <Route path="feeStats" element={<FeeStats />} />
        <Route path="userStats" element={<UserStats />} />
        <Route path="validationStats" element={<ValidationStats />} />
        <Route path="/dash/adminStats" element={<AdminStats />} />
        <Route path="exports" element={<ExportsPage />} />
        <Route path="exports/history" element={<MyExportsPage />} />
      </Route>


      {/* Anything else */}
      <Route path="*" element={<NotFound />} />

    </Routes>
  );
}