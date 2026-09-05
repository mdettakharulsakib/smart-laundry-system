import { getCurrentUser } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import LaundryDashboard from "@/components/LaundryDashboard";

export default function LaundryDashboardPage() {
  const user = getCurrentUser();
  return (
    <div>
      <Navbar user={user} />
      <LaundryDashboard />
    </div>
  );
}
