import { Fragment } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { Shell } from "@/components/layout/shell";
import { Toaster } from "@/components/ui/toaster";
import { Dashboard } from "@/pages/dashboard";
import { Members } from "@/pages/members";
import { OrgSettings } from "@/pages/org-settings";
import { SystemUsers } from "@/pages/system/users";
import { AcceptInvitation } from "@/pages/accept-invitation";
import { Login } from "@/pages/login";
import { Signup } from "@/pages/signup";
import { ForgotPassword } from "@/pages/forgot-password";
import { ResetPassword } from "@/pages/reset-password";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <p className="text-sm text-muted-foreground">Loading...</p>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return <Fragment>{children}</Fragment>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
    const { user, isLoading } = useAuth();

    if (isLoading) return null;

    if (user?.role !== "admin") {
        return <Navigate to="/" replace />;
    }

    return <Fragment>{children}</Fragment>;
}

export default function App() {
    return (
        <BrowserRouter
            basename="/app"
            future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/invite/:id" element={<AcceptInvitation />} />
                <Route
                    path="/*"
                    element={
                        <ProtectedRoute>
                            <Shell>
                                <Routes>
                                    <Route path="/" element={<Dashboard />} />
                                    <Route
                                        path="/members"
                                        element={<Members />}
                                    />
                                    <Route
                                        path="/settings"
                                        element={<OrgSettings />}
                                    />
                                    <Route
                                        path="/system/users"
                                        element={
                                            <AdminRoute>
                                                <SystemUsers />
                                            </AdminRoute>
                                        }
                                    />
                                </Routes>
                            </Shell>
                        </ProtectedRoute>
                    }
                />
            </Routes>
            <Toaster />
        </BrowserRouter>
    );
}
