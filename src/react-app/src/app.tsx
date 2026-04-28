import { Fragment } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { Shell } from "@/components/layout/shell";
import { Toaster } from "@/components/ui/toaster";
import { Members } from "@/pages/members";
import { OrgSettings } from "@/pages/org-settings";
import { SystemUsers } from "@/pages/system/users";
import { AcceptInvitation } from "@/pages/accept-invitation";
import { Login } from "@/pages/login";
import { Signup } from "@/pages/signup";
import { ForgotPassword } from "@/pages/forgot-password";
import { ResetPassword } from "@/pages/reset-password";
import { IssuesList } from "@/pages/issues/list";
import { IssuesBoard } from "@/pages/issues/board";
import { NewIssue } from "@/pages/issues/new";
import { IssueDetail } from "@/pages/issues/detail";
import { InitiativesList } from "@/pages/initiatives/list";
import { InitiativeDetail } from "@/pages/initiatives/detail";
import { LabelsPage } from "@/pages/labels";
import { PublicInitiative } from "@/pages/public/initiative";
import { PublicIssue } from "@/pages/public/issue";
import { copy } from "@/lib/copy";

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

function NotFound() {
    return (
        <div className="mx-auto max-w-md py-24 text-center">
            <h1 className="text-2xl font-bold">{copy.notFound.title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
                {copy.notFound.description}
            </p>
        </div>
    );
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
                    path="/public/:orgSlug/:slug"
                    element={<PublicInitiative />}
                />
                <Route
                    path="/public/:orgSlug/:slug/:number"
                    element={<PublicIssue />}
                />
                <Route
                    path="/*"
                    element={
                        <ProtectedRoute>
                            <Shell>
                                <Routes>
                                    <Route
                                        path="/"
                                        element={
                                            <Navigate to="/issues" replace />
                                        }
                                    />
                                    <Route
                                        path="/issues"
                                        element={<IssuesBoard />}
                                    />
                                    <Route
                                        path="/issues/list"
                                        element={<IssuesList />}
                                    />
                                    <Route
                                        path="/issues/new"
                                        element={<NewIssue />}
                                    />
                                    <Route
                                        path="/issues/:number"
                                        element={<IssueDetail />}
                                    />
                                    <Route
                                        path="/initiatives"
                                        element={<InitiativesList />}
                                    />
                                    <Route
                                        path="/initiatives/:slug"
                                        element={<InitiativeDetail />}
                                    />
                                    <Route
                                        path="/labels"
                                        element={<LabelsPage />}
                                    />
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
                                    <Route path="*" element={<NotFound />} />
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
