import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import logo from "@/assets/logo.png";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Eye, EyeOff } from "lucide-react";

const Login = () => {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSignup, setIsSignup] = useState(false);
  const [selectedRole, setSelectedRole] = useState<"admin" | "student">("student");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (user && role) {
      navigate(role === "admin" ? "/admin" : "/dashboard");
    }
  }, [user, role, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!email.endsWith("@brototype.com")) {
      toast.error("Please use a valid @brototype.com email");
      setIsLoading(false);
      return;
    }

    try {
      if (isSignup) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              name: name || email.split('@')[0]
            }
          }
        });

        if (error) throw error;
        toast.success("Account created! Logging you in...");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        toast.success("Login successful!");
      }
    } catch (error: any) {
      toast.error(error.message || "Authentication failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 dark">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center">
            <img src={logo} alt="Brototype" className="h-8 w-8" />
          </div>
          <h1 className="text-white text-xl font-medium">Brototype Complaint Management Portal</h1>
        </div>

        {/* Login Card */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 shadow-[0_0_20px_rgba(255,255,255,0.1)] border border-white/10">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Role Selection */}
            <div className="space-y-3">
              <Label className="text-white text-base">Login as:</Label>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="role"
                    value="admin"
                    checked={selectedRole === "admin"}
                    onChange={() => setSelectedRole("admin")}
                    className="w-4 h-4 accent-white"
                  />
                  <span className="text-white">Admin</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="role"
                    value="student"
                    checked={selectedRole === "student"}
                    onChange={() => setSelectedRole("student")}
                    className="w-4 h-4 accent-white"
                  />
                  <span className="text-white">Student</span>
                </label>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-white/20"></div>

            {/* Name field for signup */}
            {isSignup && (
              <div className="space-y-2">
                <Label htmlFor="name" className="text-white/70 text-sm">Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:bg-white/15 focus:border-white/40"
                />
              </div>
            )}

            {/* Email/Username Field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white/70 text-sm">Username / Email:</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.name@brototype.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:bg-white/15 focus:border-white/40"
              />
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-white/70 text-sm">Password:</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Minimum 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:bg-white/15 focus:border-white/40 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Login Button */}
            <Button 
              type="submit" 
              className="w-full bg-white text-black hover:bg-black hover:text-white hover:border hover:border-white transition-all duration-300 font-semibold h-12 text-base rounded-lg" 
              disabled={isLoading}
            >
              {isLoading ? (isSignup ? "Creating account..." : "Signing in...") : "Login"}
            </Button>

            {/* Toggle Sign Up/Sign In */}
            <div className="text-center">
              <button
                type="button"
                onClick={() => setIsSignup(!isSignup)}
                className="text-sm text-white/60 hover:text-white transition-colors"
              >
                {isSignup ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
