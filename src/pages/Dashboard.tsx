import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, LogOut, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import logo from "@/assets/logo.png";

type Complaint = {
  id: string;
  title: string;
  category: string;
  status: "Open" | "In Progress" | "Resolved";
  created_at: string;
  description: string;
};

const Dashboard = () => {
  const navigate = useNavigate();
  const userEmail = localStorage.getItem("userEmail");

  const [complaints] = useState<Complaint[]>([
    {
      id: "c101",
      title: "Wi-Fi Not Working",
      category: "Infrastructure",
      status: "In Progress",
      created_at: "2025-11-11T11:00:00Z",
      description: "The Wi-Fi in Lab 2 is down since morning.",
    },
    {
      id: "c102",
      title: "Projector Issue",
      category: "Technical",
      status: "Open",
      created_at: "2025-11-10T14:30:00Z",
      description: "Projector in room A1 is not displaying properly.",
    },
    {
      id: "c103",
      title: "AC Temperature",
      category: "Infrastructure",
      status: "Resolved",
      created_at: "2025-11-09T09:15:00Z",
      description: "AC is too cold in the main hall.",
    },
  ]);

  const handleLogout = () => {
    localStorage.removeItem("userRole");
    localStorage.removeItem("userEmail");
    navigate("/login");
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Open":
        return <AlertCircle className="h-4 w-4" />;
      case "In Progress":
        return <Clock className="h-4 w-4" />;
      case "Resolved":
        return <CheckCircle2 className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "outline" => {
    switch (status) {
      case "Open":
        return "default";
      case "In Progress":
        return "secondary";
      case "Resolved":
        return "outline";
      default:
        return "default";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Brototype" className="h-10 w-10" />
            <div>
              <h1 className="text-xl font-bold">Complaint Portal</h1>
              <p className="text-sm text-muted-foreground">{userEmail}</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold">My Complaints</h2>
            <p className="text-muted-foreground">Track and manage your submitted complaints</p>
          </div>
          <Button onClick={() => navigate("/new-complaint")}>
            <Plus className="h-4 w-4 mr-2" />
            New Complaint
          </Button>
        </div>

        <div className="grid gap-4">
          {complaints.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No complaints submitted yet</p>
                <Button onClick={() => navigate("/new-complaint")} className="mt-4">
                  Submit Your First Complaint
                </Button>
              </CardContent>
            </Card>
          ) : (
            complaints.map((complaint) => (
              <Card key={complaint.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle>{complaint.title}</CardTitle>
                      <CardDescription>{complaint.description}</CardDescription>
                    </div>
                    <Badge variant={getStatusVariant(complaint.status)} className="flex items-center gap-1">
                      {getStatusIcon(complaint.status)}
                      {complaint.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="font-medium">{complaint.category}</span>
                    <span>•</span>
                    <span>{new Date(complaint.created_at).toLocaleDateString()}</span>
                    <span>•</span>
                    <span className="text-primary">ID: {complaint.id}</span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
