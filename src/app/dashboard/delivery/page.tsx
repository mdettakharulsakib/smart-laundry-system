import { getCurrentUser } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import DeliveryDashboard from "@/components/DeliveryDashboard";

export default function DeliveryDashboardPage() {
  const user = getCurrentUser();
  return (
    <div>
      <Navbar user={user} />
      <DeliveryDashboard />
    </div>
  );
}
