import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Phone, ArrowLeft, Loader2, Eye, EyeOff } from "lucide-react";

const AdminLogin = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  // Admin credentials (hardcoded for now)
  const ADMIN_EMAIL = "email.hassan.cs@gmail.com";
  const ADMIN_PASSWORD = "admin123";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      toast.error("Please enter both email and password");
      return;
    }

    setLoading(true);

    try {
      // Validate credentials
      if (formData.email !== ADMIN_EMAIL || formData.password !== ADMIN_PASSWORD) {
        toast.error("Invalid email or password");
        setLoading(false);
        return;
      }

      // Store admin session in localStorage
      const adminSession = {
        email: ADMIN_EMAIL,
        token: `admin_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        loginTime: new Date().toISOString(),
      };

      localStorage.setItem("admin_session", JSON.stringify(adminSession));

      toast.success("Admin login successful!");
      navigate("/admin");
    } catch (error: any) {
      toast.error("An error occurred during login");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col">
      {/* Header */}
      <header className="border-b bg-black/30 backdrop-blur-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Phone className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Dilbar Mobiles</h1>
              <p className="text-xs text-gray-300">Admin Panel</p>
            </div>
          </Link>

          <Link to="/">
            <Button variant="outline" size="sm" className="gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl border-purple-500/20 bg-slate-900/90 backdrop-blur-sm">
          <CardHeader className="space-y-1 border-b border-purple-500/20">
            <CardTitle className="text-3xl font-bold text-white">Admin Login</CardTitle>
            <CardDescription className="text-gray-400">
              Enter your admin credentials to access the panel
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@example.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                  autoComplete="email"
                  className="bg-slate-800/50 border-purple-500/30 text-white placeholder:text-gray-500 focus:border-purple-500 focus:bg-slate-800"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-white">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    required
                    autoComplete="current-password"
                    className="bg-slate-800/50 border-purple-500/30 text-white placeholder:text-gray-500 focus:border-purple-500 focus:bg-slate-800 pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 text-gray-400 hover:text-white"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full mt-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold h-10"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  "Login to Admin Panel"
                )}
              </Button>

              <div className="mt-6 pt-6 border-t border-purple-500/20">
                <p className="text-xs text-gray-400 text-center">
                  <span className="text-yellow-400">⚠️ Restricted Access</span>
                  <br />
                  This panel is for administrators only. Unauthorized access is monitored.
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <footer className="border-t border-purple-500/20 bg-black/30 backdrop-blur-sm text-center py-4 text-gray-400 text-sm">
        <p>© 2026 Dilbar Mobiles. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default AdminLogin;
