# FRONTEND_DOCS.md – React Frontend Documentation

## 1. Introduction

This document describes the React frontend for the architectural association management system. It is a single‑page application built with **Vite**, **Tailwind CSS**, and **React Router v6**. State is managed via React Context API.

The app is fully translated into **French** (with some Arabic place names) and is used by administrators to manage members, fees, payments, files, and generate official PDF documents (receipts, financial situations, degree certificates).

---

## 2. Project Structure
////


**Naming conventions**:
- Pages are PascalCase, with `.jsx` extension.
- Components are also PascalCase.
- Contexts are named with `Context` suffix and export both provider and consumer hook.
- API utility functions are in `Components/api.js`.

---

## 3. Contexts (Global State)

All contexts are defined in `src/Context/` and are wrapped around the app in `main.jsx`.

### 3.1 `UserContext`

- **Provider**: `UserProvider`
- **Hook**: `useUser()`
- **Provides**: 
  - `authData`: `{ user: { id, firstName, lastName, role, ... }, token, refreshToken }`
  - `setAuthData(data)`: updates the state (used after login/refresh).
- **Used in**: 
  - `ProtectedRoute` to check authentication.
  - All pages that need current user info or token.
  - `Layout` for user menu.
- **Persistence**: Currently in memory (lost on refresh). In production, consider storing in `localStorage` or `sessionStorage`.

### 3.2 `UserDataContext`

- **Provider**: `UserDataProvider`
- **Hook**: `useUserData()`
- **Provides**: 
  - `users`: array of user objects fetched from API.
  - `setUsers(users)`: for updates.
  - `fetchUsers()`: function to reload the list (used after CRUD operations).
- **Used in**: 
  - `getUsers` page to display the member list.
  - Other pages that need a list of members.

### 3.3 `SearchBarContext`

- **Provider**: `SearchBarProvider`
- **Hook**: `useSearchBar()`
- **Provides**: 
  - `searchKeyword`: string.
  - `setSearchKeyword(keyword)`: updates it.
- **Used in**: 
  - `getUsers` page for filtering members by name, email, registration number.
  - `Navbar` (if it contains the search input).

### 3.4 `ErrorContext`

- **Provider**: `ErrorProvider`
- **Hook**: `useError()`
- **Provides**:
  - `showError(message)`
  - `showWarning(message)`
  - `showSuccess(message)`
- **Implementation**: Uses a queue of toasts with auto‑dismiss (5 seconds).
- **Used in**: 
  - Almost every component to display user feedback.

### 3.5 `ModalContext`

- **Provider**: `ModalProvider`
- **Hook**: `useModal()`
- **Provides**:
  - `confirm(options)`: returns a Promise that resolves to `true` if user clicks OK, `false` if cancelled.
    - `options = { title, message, confirmText, cancelText }`
  - `alert(options)`: returns a Promise that resolves when user clicks OK.
- **Used in**: 
  - Delete operations, state‑changing actions that require confirmation.

---

## 4. API Communication

### 4.1 Base URL & Environment

The backend API base URL is set in `frontend/.env`:

Current usage: Many components do not use fetchWithRefresh but directly use fetch with token from context. This is a TODO to unify. For new development, prefer fetchWithRefresh.

4.3 Response Envelope
The backend wraps most responses in { data: { ... } }. For example:

GET /users returns { data: [ ... ] }

GET /users/1 returns { data: { id: 1, ... } }

However, some endpoints (like PDF preview) return raw binary blobs.

Pattern: When fetching JSON, you usually need:

javascript
const response = await fetch(...);
const json = await response.json();
const result = json.data; // or json.data.data depending on structure
Be careful: Some endpoints return the data directly without the data wrapper (e.g., job status endpoints). Check the backend documentation.

4.4 Error Handling
API errors (4xx/5xx) are caught and passed to showError() via ErrorContext.

Network errors also trigger showError('Erreur de connexion au serveur').

Specific error messages from the backend (e.g., { message: '...' }) are displayed when available.

4.5 File Uploads
File uploads (avatars, documents, backgrounds) use FormData:

javascript
const formData = new FormData();
formData.append('file', file);
const response = await fetch(`${API_URL}/files/upload`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
  body: formData
});
Do not set Content-Type header; the browser will set it with the boundary.

5. Pages
5.1 ProfilePage.jsx
Route: /profile/:id? (if no id, show current user)

Purpose: Display and edit a member’s profile, with multiple tabs:

Informations – editable fields (firstName, lastName, email, phone, wilaya, registrationNumber, role, preferences).

Fichiers – list of uploaded files (with upload button and delete).

Cotisations – list of fees with payment status.

Paiements – payment history.

Crédits – credit transaction history.

Key Actions:

Valider – Save changes (PUT /users/:id).

Modifier – enable edit mode.

Diplôme – generate degree certificate (opens preview modal).

Situation financière – generate financial situation PDF (opens preview modal).

Receipt – generate receipt for a specific payment.

Delete – delete user (with confirmation).

State:

isEditing: boolean.

userData: local copy of user.

activeTab: string.

previewModalOpen, previewPdfUrl, previewTitle.

Functions:

handleSave: validates and calls API.

handlePrintDegree: calls /pdf/preview/degree with user data → opens modal.

handlePrintSituation: similar for situation.

handleGenerateReceipt: for individual payments.

5.2 getUsers.jsx
Route: /users

Purpose: List all members with search, filters, pagination.

Features:

Search by name, email, registration number (uses SearchBarContext).

Filters: Wilaya (dropdown), Profession (from API), Role.

Pagination: limit=20, with next/prev buttons.

Context menu (three dots) on each row with actions:

Voir détails → opens UserDetailsModal.

Imprimer situation → generate financial situation.

Générer reçu → generate receipt for last unpaid fee.

Row colors: green for “À jour” (fees paid), red for “En retard”.

State:

users (from UserDataContext).

filters: wilaya, profession, role.

pagination: page, totalPages.

selectedUser: for modal.

Functions:

fetchUsers: calls GET /users with query params.

handleFilterChange: updates filters and refetch.

handleContextAction: triggers generation modals.

5.3 BackgroundManager.jsx
Route: /backgrounds (admin only)

Purpose: Manage degree certificate backgrounds and template settings.

Tabs:

Arrière‑plan – upload background images (PNG/JPEG) to Cloudinary.

CSS personnalisé – edit CSS that will be injected into degree PDF.

Template HTML – edit the full Handlebars HTML for the degree.

Data: Uses TemplateSettings API:

GET /template-settings/degree – get current settings.

PUT /template-settings/degree – update.

Upload: Drag‑and‑drop or click to upload image → POST /files/upload-background.

Preview: Shows current background and CSS in an iframe (HTML preview).

5.4 PermissionManager.jsx
Route: /permissions (super_admin only)

Purpose: Manage permission versions.

Features:

List all permission versions.

Activate a version (sets isActive=true).

Rollback to previous version.

Edit field visibility per role (JSON editor).

API:

GET /permissions

POST /permissions (create new version)

PUT /permissions/:id/activate

POST /permissions/:id/rollback

5.5 FeeManagementPage.jsx & PaymentPage.jsx
FeeManagementPage (/fees): CRUD for fee definitions (year, amount, due date, penalty rate).
PaymentPage (/payments): Record payments for a user, select fee, amount, method (cash, bank transfer, cheque, etc.).

5.6 FinancialSituationPage.jsx
Route: /financial-situation

Shows a summary of the user’s financial situation (total due, paid, credits, penalties) for the current year.

6. Reusable Components
6.1 PDFPreviewModal.jsx
Props:

isOpen: boolean.

pdfUrl: string (URL to the PDF blob or Cloudinary URL).

title: string (displayed in header).

onClose: function.

onGenerate: function (for final generation).

onEmail: function (send email).

jobId: string (optional, when polling).

isGenerating: boolean.

State:

loading: boolean.

generatedPdfUrl: string (final PDF after generation).

jobStatus: string ('pending', 'completed', 'failed').

Behavior:

If pdfUrl is a blob URL, it is displayed in an <iframe>.

Buttons: Télécharger (downloads the PDF), Générer (calls onGenerate), 📧 Email (calls onEmail).

If jobId is provided, it starts polling every 2 seconds to check job status via GET /pdf/jobs/:jobId. When status becomes completed, it fetches the final PDF URL and updates the iframe.

6.2 FileCard.jsx
Props:

file: { id, originalName, url, mimeType, size, uploadedAt }

onDelete: function.

onDownload: function.

Displays file icon based on mime type, size formatted, and delete button.

6.3 PaymentCard.jsx
Props:

payment: { id, amount, date, method, status, fee: { year } }

onGenerateReceipt: function.

Shows payment details with status badge.

6.4 CotisationCard.jsx
Props:

fee: { year, amount, dueDate, penaltyRate }

status: 'paid' | 'unpaid' | 'late'.

payment: payment object if paid.

6.5 CreditTransactionCard.jsx
Props:

transaction: { amount, type, description, createdAt }

6.6 UserDetailsModal.jsx
Props:

user: user object.

isOpen: boolean.

onClose: function.

Displays detailed info in a modal (similar to profile but read‑only).

7. PDF Generation Flow (Detailed)
The PDF flow is critical. Here's a step‑by‑step explanation for generating a degree certificate.

7.1 Preview
User clicks Diplôme on ProfilePage.

handlePrintDegree collects user data and calls:

javascript
const response = await fetch(`${API_URL}/pdf/preview/degree`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  },
  body: JSON.stringify(userData)
});
const blob = await response.blob();
const url = URL.createObjectURL(blob);
It opens PDFPreviewModal with pdfUrl={url} and title="Aperçu du Diplôme".

7.2 Final Generation (Queue)
In the modal, user clicks Générer.

onGenerate callback is triggered (passed from parent).

Parent calls:

javascript
const response = await fetch(`${API_URL}/pdf/degree`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  body: JSON.stringify(userData)
});
const result = await response.json();
const jobId = result.jobId; // Backend returns { jobId }
Parent sets jobId in modal state, which triggers polling inside PDFPreviewModal.

7.3 Polling
Inside PDFPreviewModal, a useEffect watches jobId:

javascript
useEffect(() => {
  if (!jobId) return;
  const interval = setInterval(async () => {
    const res = await fetch(`${API_URL}/pdf/jobs/${jobId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.status === 'completed') {
      clearInterval(interval);
      const finalUrl = data.result.url; // Cloudinary URL
      setGeneratedPdfUrl(finalUrl);
      setJobStatus('completed');
    } else if (data.status === 'failed') {
      clearInterval(interval);
      showError('Erreur lors de la génération');
    }
  }, 2000);
  return () => clearInterval(interval);
}, [jobId]);
When completed, the modal shows the final PDF (fetched from Cloudinary). The user can then Télécharger (download via window.open(generatedPdfUrl) or <a> tag) or 📧 Email.

7.4 Sending by Email
The 📧 Email button triggers:

javascript
await fetch(`${API_URL}/pdf/send-degree-email`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  body: JSON.stringify({ userId: user.id, pdfUrl: generatedPdfUrl })
});
The backend will send the PDF as an attachment.

Note: There is an in‑memory cache on the backend to prevent duplicate emails for 10 minutes.

7.5 Financial Situation & Receipt
Similar flows exist for financial situation and receipt generation, using different endpoints:

/pdf/preview/situation

/pdf/situation (queue)

/pdf/preview/receipt

/pdf/receipt

8. Styling and Design System
8.1 Tailwind Configuration
Colors:

Primary dark background: bg-gradient-to-br from-gray-900 to-gray-800.

Accent: gold/yellow (yellow-400, yellow-500, amber-400).

Cards: bg-gray-800/50 with backdrop blur, border border-gray-700.

Typography:

Font: Inter (from Google Fonts) set in index.css.

Headings: text-2xl font-bold text-white.

Buttons:

Primary: bg-yellow-500 hover:bg-yellow-600 text-gray-900.

Secondary: bg-gray-700 hover:bg-gray-600 text-white.

Danger: bg-red-600 hover:bg-red-700.

8.2 Custom Scrollbar
Added in index.css:

css
::-webkit-scrollbar { width: 8px; }
::-webkit-scrollbar-track { background: #1f2937; }
::-webkit-scrollbar-thumb { background: #fbbf24; border-radius: 4px; }
8.3 Layout
Layout.jsx provides a fixed sidebar on the left (collapsible) and a top navbar. The main content area scrolls.

Sidebar items: Dashboard, Utilisateurs, Cotisations, Paiements, Situation financière, Fichiers, Arrière‑plans, Permissions (admin only).

8.4 Responsive
Tailwind classes like md:flex, lg:grid-cols-2, etc., are used for responsive layouts. The sidebar collapses on smaller screens.

9. Common Patterns
9.1 Confirmation Dialog
Using ModalContext:

javascript
const { confirm } = useModal();
const handleDelete = async () => {
  const confirmed = await confirm({
    title: 'Supprimer',
    message: 'Voulez‑vous vraiment supprimer cet utilisateur ?',
    confirmText: 'Oui',
    cancelText: 'Annuler'
  });
  if (confirmed) {
    // call delete API
  }
};
9.2 Toast Notifications
javascript
const { showError, showSuccess, showWarning } = useError();

try {
  await apiCall();
  showSuccess('Opération réussie !');
} catch (err) {
  showError(err.message || 'Une erreur est survenue');
}
9.3 Pagination
A common pattern in getUsers:

javascript
const [page, setPage] = useState(1);
const limit = 20;

const fetchUsers = async () => {
  const res = await fetch(`${API_URL}/users?page=${page}&limit=${limit}&search=${searchKeyword}&...`);
  const data = await res.json();
  setUsers(data.data);
  setTotalPages(data.meta.totalPages);
};
Buttons for previous/next.

9.4 File Download
For downloading a file from a URL:

javascript
const download = (url, filename) => {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};
9.5 File Upload with FormData
javascript
const uploadFile = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_URL}/files/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData
  });
  const data = await res.json();
  return data.data; // { publicId, url, ... }
};
9.6 Date Formatting
Use new Date(dateString).toLocaleDateString('fr-FR') for French formatting.

10. Adding New Features / How to Extend
10.1 Adding a New Page
Create a new .jsx file in src/pages/.

Import necessary contexts and hooks.

Add a new route in App.jsx with <Route path="/newpage" element={<NewPage />} />.

If the page requires authentication, wrap with <ProtectedRoute>.

Optionally add a sidebar link in Layout.jsx.

10.2 Adding a New API Call
Use fetchWithRefresh if possible.

Handle loading state (spinner) and error state (toast).

For POST/PUT, send JSON with Content-Type: application/json.

10.3 Adding a New Global Context
Create a new file in src/Context/, export a Provider and a custom hook.

Add the Provider to main.jsx wrapping the app.

Use useContext or the custom hook in components.

10.4 Modifying PDF Templates
Go to BackgroundManager page (admin).

Edit HTML or CSS; changes are stored in DB and will be used in future PDF generations.

10.5 Improving Polling Logic
Currently, polling is done with setInterval. Consider using a WebSocket or Server‑Sent Events for real‑time updates in the future.

11. Troubleshooting Common Issues
Issue	Solution
API calls fail with 401	Token expired; refresh token flow should be implemented. Use fetchWithRefresh.
PDF preview not showing	Ensure backend returns correct Content-Type: application/pdf. Check blob response.
Modal not opening	Verify isOpen prop is properly toggled and modal component is rendered.
Search not updating	Check that SearchBarContext is correctly updating and getUsers is listening.
CORS errors	Backend must enable CORS (app.enableCors()). Check VITE_API_URL is correct.
File upload fails	Check file size limits (Cloudinary has 10MB limit for free plan). Ensure multipart/form-data is used.
12. Dependencies
Key dependencies:

react, react-dom

react-router-dom (v6)

tailwindcss, autoprefixer, postcss

vite

@headlessui/react (for dropdowns, modals)

@heroicons/react (icons)

react-hot-toast (or similar) – currently custom toast via context.

13. Contributing Guidelines
Use functional components with hooks.

Follow ESLint rules (if configured).

Write descriptive variable names and comment complex logic.

Keep components small and focused; extract reusable pieces.

Use PropTypes or TypeScript for type checking (TypeScript not used yet, but consider).

Happy coding! 🚀