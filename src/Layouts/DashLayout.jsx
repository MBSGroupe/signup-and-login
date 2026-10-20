// Layouts/AdminLayout.jsx
import PageOutlet from "../Components/PageOutlet";
import SideBar from "../Components/Navbar/SideBar";
import AdminHeader from "../Components/Navbar/AdminHeader";
export default function DashLayout() {
  return (
    <>
     <AdminHeader />
      <SideBar /> {/* admin sidebar */}
      <main className="ml-[220px] min-h-screen">
        <PageOutlet />
      </main>
    </>
  );
}
