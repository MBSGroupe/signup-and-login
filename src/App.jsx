import { Routes, Route } from "react-router-dom";
import MainLayout from './Layouts/MainLayout';
import AuthLayout from './Layouts/AuthLayout';
import DashLayout from './Layouts/DashLayout';

import ProtectedRoute from './Layouts/ProtectedRoute';
import AdminRoute from './Layouts/AdminRoute';

import LoginForm from './Pages/Login';
import FormulaireCNOA from './Pages/Sign-up';
import ProfilePage from './Pages/ProfilePage';
import ResetPassword from './Pages/DashBoard/Users/resetPassword';
import OnboardingPage from './Pages/OnboardingPage';
import VerifyPage from './Pages/VerificationPage';
import VerifyPendingPage from './Pages/VerifyPending';
import NotificationsPage from './Pages/NotificationPage'
import PreferencesPage from './Pages/PreferencesPage'
import VerifyDegree from './Pages/DashBoard/EtatsDeSortie/VerificationPage';
import AdminDashboard from './Pages/DashBoard/Admin Dashboard';
import GetUsers from './Pages/DashBoard/Users/getUsers';
import CreateUser from './Pages/DashBoard/Users/createUser';
import UpdateUser from './Pages/DashBoard/Users/updateUser';
import EditCotisation from "./Pages/DashBoard/Cotisations/EditCotisation";
import DeleteItem from './Components/deleteItem';
import AdminUserView from './Pages/DashBoard/Users/AdminView/AdminUserView';
import GetCotisations from "./Pages/DashBoard/Cotisations/getCotisations";
import FeeStats from "./Pages/DashBoard/Stats/FeeStats";
import UserStats from "./Pages/DashBoard/Stats/UserStats";
import CreateBulkCotisation from "./Pages/DashBoard/Cotisations/CreateBulkCotisations";
import PermissionManager from "./Pages/DashBoard/Permissions/PermissionConfig";
import PermissionDetails from "./Pages/DashBoard/Permissions/getSchema";
import NewVersion from "./Pages/DashBoard/Permissions/createVersion";
import EditVersion from "./Pages/DashBoard/Permissions/EditVersion";
import ValidationRequestDetail from "./Pages/DashBoard/Validations/ValidationRequestsDetail";
import ValidationRequestsList from "./Pages/DashBoard/Validations/ValidationRequestsList";
import ValidationSchemasList from "./Pages/DashBoard/Validations/ValidationSchemasAdmin";
import NewValidationSchema from "./Pages/DashBoard/Validations/NewValidationSchema";
import EditValidationSchema from "./Pages/DashBoard/Validations/EditValidationSchema";
import ValidationSchemaVersions from "./Pages/DashBoard/Validations/ValidationSchemasVersions";
import AllValidationRequests from "./Pages/DashBoard/Validations/allValidationRequests";
import ValidationSchemaDetails from './Pages/DashBoard/Validations/ValidationSchemaDetails'
import ValidationRequestProgress from './Pages/DashBoard/Validations/ValidationRequestsProgress';

import BackgroundManager from './Pages/DashBoard/EtatsDeSortie/BackgroundManager'

// 👇 IMPORT THE NEW COMPONENT
import PixelNo from './Components/NO';

export default function App() {
  return (
    <Routes>

      {/* PUBLIC / MAIN LAYOUT */}
      <Route path="/" element={<MainLayout />}>
        <Route index element={<LoginForm />} />
        <Route path="signup" element={<FormulaireCNOA />} />
        
        {/* 👇 ADD THE NEW ROUTE HERE */}
      <Route 
        path="pixel-no" 
        element={
          <PixelNo 
            rows={25}
            cols={50}
            pixelSize={20}
            gap={2}
            color="#facc15"
            bgColor="#0f0f1a"
            speed={2}
            onComplete={() => console.log('Pixel NO complete!')}
          />
        } 
      />
      </Route>

      {/* AUTH LAYOUT (logged in pages) */}
      <Route path="/auth" element={<AuthLayout />}>
        <Route path="verify-pending" element={<VerifyPendingPage />} />
        <Route path="verify" element={<VerifyPage />} />
        <Route path="notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
        <Route path="preferences" element={<ProtectedRoute><PreferencesPage /></ProtectedRoute>} />
        {/* Pages accessible to any logged-in user */}
        <Route path="profile" element={
          <ProtectedRoute><ProfilePage /></ProtectedRoute>
        } />
        <Route path="resetPsw" element={
          <ProtectedRoute><ResetPassword /></ProtectedRoute>
        } />
        <Route path="update/:id" element={
          <ProtectedRoute> <UpdateUser /> </ProtectedRoute>} />
        <Route path="edit/fee/:id" element={
          <ProtectedRoute> <EditCotisation /> </ProtectedRoute>} />
        <Route path="onboarding" element={
          <ProtectedRoute><OnboardingPage /></ProtectedRoute>
        } /> 
      </Route>

      {/* DASHBOARD / ADMIN LAYOUT */}
      <Route path="/dash" element={
        <AdminRoute><DashLayout /></AdminRoute>
      }>
        <Route index element={<AdminDashboard />} />
        <Route path="allUsers" element={<GetUsers mode="users" />} />
        <Route path="allMembers" element={<GetUsers mode="membres" />} />
        <Route path="allCotisations" element={<GetCotisations/>} />
        <Route path="createUser" element={<CreateUser/>} />
        <Route path="ajouterCotisation" element={<CreateBulkCotisation />} />


        <Route path="permissions" element={<PermissionManager />} />
        <Route path="permissions/:model/:versionId" element={<PermissionDetails />} />
        <Route path="permissions/new/:model" element={<NewVersion />} />
        <Route path="permissions/edit/:versionId" element={<EditVersion />} />

        <Route path="validation/requests" element={<ValidationRequestsList />} />
        <Route path="validation/all-requests" element={<AllValidationRequests />} />
        <Route path="validation/requests/:id" element={<ValidationRequestDetail />} />
        
        <Route path="validation/schemas" element={<ValidationSchemasList />} />
        <Route path="validation/schemas/new" element={<NewValidationSchema />} />
        <Route path="validation/schemas/:schemaId/edit" element={<EditValidationSchema />} />
        <Route path="validation/schemas/:schemaId/versions" element={<ValidationSchemaVersions />} />
        <Route path="validation/schemas/:schemaId" element={<ValidationSchemaDetails />} />
        <Route path="validation/progress/:id" element={<ValidationRequestProgress />} />

        <Route path="template/background" element={< BackgroundManager/>} />
        <Route path="verify/degree/:token" element={<VerifyDegree />} />

        <Route path="delete/:id" element={<DeleteItem mode='user' />} />
        <Route path="cancel/fee/:id" element={<DeleteItem mode='cotisation' />} />
        <Route path="adminUser/:id" element={<AdminUserView />} />
        <Route path="feeStats" element={<FeeStats />} />
        <Route path="userStats" element={<UserStats />} />

      </Route>

    </Routes>
  );
}