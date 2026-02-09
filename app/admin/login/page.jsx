"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/components/AuthContext";
import { useTheme } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import Icon from "@/components/common/Icon";

export default function AdminLoginPage() {
  const router = useRouter();
  const { login, user, isLoading: authLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // ✅ variables similar to your old login page
  const [form, setForm] = useState({ login: "", password: "" });
  const [touched, setTouched] = useState({ login: false, password: false });

  // keep UI behaviors
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [focusedField, setFocusedField] = useState(null);

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const onBlurField = (k) => setTouched((t) => ({ ...t, [k]: true }));

  const errors = useMemo(() => {
    const e = {};
    if (touched.login && form.login.trim().length < 3) {
      e.login = "Enter at least 3 characters.";
    }
    if (touched.password && form.password.length < 6) {
      e.password = "Password should be 6+ characters.";
    }
    return e;
  }, [form, touched]);

  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/admin/dashboard");
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setError("");

    const loginValue = form.login.trim();
    const password = form.password;

    if (!loginValue || !password) {
      setError("Please enter your email/username and password.");
      return;
    }

    try {
      setLoading(true);
      const result = await login(loginValue, password, rememberMe);

      if (result.success) {
        router.push("/admin/dashboard");
        return;
      }

      setError(result.error || "Incorrect username or password.");
      setForm((prev) => ({ ...prev, password: "" }));
      setTouched((t) => ({ ...t, password: false }));
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-6"
        >
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Icon name="GraduationCap" className="w-8 h-8 text-primary" />
            </div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-primary/30 border-t-primary rounded-2xl animate-spin" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">Loading UpCourse...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left Side - Branding Panel */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-primary/80" />

        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        <motion.div
          className="absolute top-20 left-20 w-64 h-64 rounded-full bg-white/10 blur-3xl"
          animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-40 right-20 w-96 h-96 rounded-full bg-white/10 blur-3xl"
          animate={{ x: [0, -20, 0], y: [0, 30, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 text-white">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="flex items-center gap-3 mb-2">
              {/* Icon clipped mask */}
              <div className="relative w-12 h-12 rounded-xl bg-white overflow-hidden flex items-center justify-center">
                <Image
                  src="/logo.png"
                  alt="UpCourse Logo"
                  fill
                  className="object-cover brightness-0"
                />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            <h1 className="text-4xl xl:text-5xl font-bold leading-tight text-balance">
              Find your path
            </h1>
            <p className="text-lg xl:text-xl text-white/80 leading-relaxed max-w-lg">
              Help shape the future of senior high school students.
            </p>

            <div className="flex gap-8 pt-4">
              {[
                // { value: "10K+", label: "Students" },
                // { value: "500+", label: "Resources" },
                // { value: "50+", label: "Career Paths" },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="text-center"
                >
                  <div className="text-3xl xl:text-4xl font-bold">{stat.value}</div>
                  <div className="text-sm text-white/60 font-medium">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="text-sm text-white/50">
            2026 UpCourse. All rights reserved.
          </motion.div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex flex-col">
        {/* Theme Toggle */}
        <div className="flex justify-end p-4">
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-full">
            <Icon name={theme === "dark" ? "sun" : "moon"} className="w-5 h-5" />
            <span className="sr-only">Toggle theme</span>
          </Button>
        </div>

        <div className="flex-1 flex items-center justify-center px-6 py-12 sm:px-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md space-y-8">
            <div className="lg:hidden text-center mb-8">
              <div className="inline-flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
                  <Icon name="GraduationCap" className="w-7 h-7 text-primary-foreground" />
                </div>
                <span className="text-2xl font-bold text-foreground">UpCourse</span>
              </div>
            </div>

            <div className="text-center lg:text-left space-y-2">
              <h2 className="text-3xl font-bold tracking-tight text-foreground">Welcome back</h2>
              <p className="text-muted-foreground">Sign in to your admin account to continue</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <AnimatePresence mode="wait">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: "auto" }}
                    exit={{ opacity: 0, y: -10, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20">
                      <Icon name="AlertCircle" className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-destructive">Authentication Failed</p>
                        <p className="text-sm text-destructive/80 mt-0.5">{error}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setError("")}
                        className="text-destructive/60 hover:text-destructive transition-colors"
                      >
                        <Icon name="X" className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Email/Username */}
              <div className="space-y-2">
                <Label htmlFor="login" className="text-sm font-medium text-foreground">
                  Email or Username
                </Label>
                <div className="relative">
                  <div
                    className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200 ${
                      focusedField === "login" ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    <Icon name="Mail" className="w-5 h-5" />
                  </div>
                  <Input
                    id="login"
                    type="text"
                    placeholder="Enter your email or username"
                    value={form.login}
                    onChange={(e) => setField("login", e.target.value)}
                    onFocus={() => setFocusedField("login")}
                    onBlur={() => {
                      setFocusedField(null);
                      onBlurField("login");
                    }}
                    className="h-12 pl-12 pr-4 text-base bg-secondary/50 border-border/50 hover:border-border focus:border-primary focus:bg-background transition-all duration-200"
                    required
                    autoComplete="username"
                    aria-invalid={!!errors.login}
                  />
                </div>
                {errors.login ? (
                  <p className="text-xs text-destructive">{errors.login}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">Use your admin email or handle.</p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium text-foreground">
                    Password
                  </Label>
                  <a
                    href="mailto:hello@upcourse.app?subject=Reset%20Admin%20Password"
                    className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    Forgot password?
                  </a>
                </div>

                <div className="relative">
                  <div
                    className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200 ${
                      focusedField === "password" ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    <Icon name="Lock" className="w-5 h-5" />
                  </div>

                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={form.password}
                    onChange={(e) => setField("password", e.target.value)}
                    onFocus={() => setFocusedField("password")}
                    onBlur={() => {
                      setFocusedField(null);
                      onBlurField("password");
                    }}
                    className="h-12 pl-12 pr-12 text-base bg-secondary/50 border-border/50 hover:border-border focus:border-primary focus:bg-background transition-all duration-200"
                    required
                    autoComplete="current-password"
                    aria-invalid={!!errors.password}
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Icon name={showPassword ? "EyeOff" : "Eye"} className="w-5 h-5" />
                  </button>
                </div>

                {errors.password ? (
                  <p className="text-xs text-destructive">{errors.password}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">Press Enter to submit.</p>
                )}
              </div>

              {/* Remember */}
              <div className="flex items-center gap-3">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(v) => setRememberMe(!!v)}
                  className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <Label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer select-none">
                  Keep me signed in for 30 days
                </Label>
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 transition-all duration-200 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30"
                disabled={loading}
              >
                {loading ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Signing in...
                  </motion.div>
                ) : (
                  <span className="flex items-center gap-2">
                    Sign in
                    <Icon name="ArrowRight" className="w-4 h-4" />
                  </span>
                )}
              </Button>
            </form>

            {/* Demo Credentials */}
            {/* <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-4 text-muted-foreground font-medium">Demo Accounts</span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="grid gap-3"
            >
              {[
                { role: "Super Admin", login: "superadmin@upcourse.test", password: "SuperAdmin!23", color: "bg-chart-1" },
                { role: "Admin", login: "admin@upcourse.test", password: "Admin!23", color: "bg-chart-2" },
                { role: "Faculty", login: "faculty.user@upcourse.test", password: "Faculty!23", color: "bg-chart-3" },
              ].map((account) => (
                <button
                  key={account.login}
                  type="button"
                  onClick={() => {
                    setField("login", account.login);
                    setField("password", account.password);
                    setError("");
                    setTouched({ login: false, password: false });
                  }}
                  className="flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-secondary/30 hover:bg-secondary/60 hover:border-border transition-all duration-200 text-left group"
                >
                  <div className={`w-10 h-10 rounded-lg ${account.color} flex items-center justify-center text-white font-bold text-sm`}>
                    {account.role[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-foreground text-sm">{account.role}</div>
                    <div className="text-xs text-muted-foreground truncate">{account.login}</div>
                  </div>
                  <Icon
                    name="ArrowRight"
                    className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-200"
                  />
                </button>
              ))}
            </motion.div> */}

            <p className="text-center text-xs text-muted-foreground pt-4">Protected area. Authorized personnel only.</p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
