import { getCurrentUser } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import CustomerDashboard from "@/components/CustomerDashboard";

export default function CustomerDashboardPage() {
  const user = getCurrentUser();
  return (
    <div>
      <Navbar user={user} />
      <CustomerDashboard />
    </div>
  );
}
