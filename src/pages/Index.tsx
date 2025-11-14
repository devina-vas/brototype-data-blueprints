import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, Clock, Shield } from "lucide-react";
import logo from "@/assets/logo.png";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const userRole = localStorage.getItem("userRole");
    if (userRole) {
      navigate(userRole === "admin" ? "/admin" : "/dashboard");
    }
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Brototype" className="h-10 w-10" />
            <h1 className="text-xl font-bold">Complaint Management Portal</h1>
          </div>
          <Button onClick={() => navigate("/login")}>Sign In</Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            BroCamp Solutions
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            A professional portal for Brototype students and admins to track,
            manage, and resolve issues seamlessly.
          </p>
          <Button size="lg" onClick={() => navigate("/login")}>
            Get Started
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <Card>
            <CardHeader>
              <AlertCircle className="h-10 w-10 mb-4" />
              <CardTitle>Submit Complaints</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Clock className="h-10 w-10 mb-4" />
              <CardTitle>Track Progress</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CheckCircle2 className="h-10 w-10 mb-4" />
              <CardTitle>Quick Resolution</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <div className="flex items-center gap-3 mb-4">
              <Shield className="h-8 w-8" />
              <CardTitle className="text-2xl">Secure & Fast</CardTitle>
            </div>
            <CardDescription className="text-base">
              Authenticate with your @brototype.com email for secure access control.
            </CardDescription>
          </CardHeader>
        </Card>
      </main>

      <footer className="border-t mt-16">
        <div className="container mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
          <p>© 2025 Brototype. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
