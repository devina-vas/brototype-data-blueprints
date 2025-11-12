import { Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

const ContactInfo = () => {
  const adminPhone = "+91 9876543210";
  const adminEmail = "talk@brototype.com";

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => window.open(`tel:${adminPhone}`)}
        className="flex items-center gap-2"
      >
        <Phone className="h-4 w-4" />
        <span className="hidden sm:inline">Call Admin</span>
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => window.open(`mailto:${adminEmail}`)}
        className="flex items-center gap-2"
      >
        <Mail className="h-4 w-4" />
        <span className="hidden sm:inline">Email Admin</span>
      </Button>
    </div>
  );
};

export default ContactInfo;
