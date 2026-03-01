import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Phone, ArrowLeft, Loader2, Eye, EyeOff } from "lucide-react";

const API_BASE = import.meta.env.VITE_LOCAL_API_URL || "";
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

declare global {
  interface Window {
    google?: any;
  }
}

const AdminLogin = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });

  // Load Google Identity Services script
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    if (document.getElementById("google-gsi-script")) return;
    const script = document.createElement("script");
    script.id = "google-gsi-script";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      toast.error("Please enter both email and password");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/v1/admin-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email, password: formData.password }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        toast.error(data.error?.message || "Invalid email or password");
        return;
      }
      const adminSession = {
        email: formData.email,
        token: data.data.session.access_token,
        loginTime: new Date().toISOString(),
      };
      localStorage.setItem("admin_session", JSON.stringify(adminSession));
      toast.success("Admin login successful!");
      navigate("/admin");
    } catch {
      toast.error("Could not connect to server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    if (!GOOGLE_CLIENT_ID) {
      toast.error("Google login is not configured yet.");
      return;
    }
    setGoogleLoading(true);
    window.google?.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: async (response: any) => {
        try {
          const res = await fetch(`${API_BASE}/auth/v1/admin-google`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id_token: response.credential }),
          });
          const data = await res.json();
          if (!res.ok || data.error) {
            toast.error(data.error?.message || "Google sign-in failed");
            return;
          }
          const adminSession = {
            email: data.data.user.email,
            token: data.data.session.access_token,
            loginTime: new Date().toISOString(),
          };
          localStorage.setItem("admin_session", JSON.stringify(adminSession));
          toast.success("Admin login successful!");
          navigate("/admin");
        } catch {
          toast.error("Google sign-in failed. Please try again.");
        } finally {
          setGoogleLoading(false);
        }
      },
    });
    window.google?.accounts.id.prompt();
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
                <Label htmlFor="email" className="text-white">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  autoComplete="email"
                  className="bg-slate-800/50 border-purple-500/30 text-white placeholder:text-gray-500 focus:border-purple-500 focus:bg-slate-800"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-white">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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

              {/* Divider */}
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-purple-500/30" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-slate-900 px-2 text-gray-400">or</span>
                </div>
              </div>

              {/* Google Sign-In */}
              <Button
                type="button"
                variant="outline"
                className="w-full h-10 bg-white text-gray-900 border-gray-300 hover:bg-gray-100 font-medium gap-2"
                onClick={handleGoogleLogin}
                disabled={googleLoading || !GOOGLE_CLIENT_ID}
              >
                {googleLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                )}
                {GOOGLE_CLIENT_ID ? "Sign in with Google" : "Google Sign-In (not configured)"}
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
