import PageOutlet from "../Components/PageOutlet";
import Navbar from "../Components/Navbar/Navbar"; // normal top nav

export default function AuthLayout() {
  return (
    <>
      <Navbar />  {/* top navigation */}
      <main className="min-h-screen">
        <PageOutlet /> {/* nested pages: profile, reset password, onboarding */}
      </main>
    </>
  );
}
