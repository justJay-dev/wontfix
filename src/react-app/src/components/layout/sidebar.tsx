import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, UsersRound, Settings } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { OrgSwitcher } from "@/components/layout/org-switcher";
import {
    Sidebar as ShadcnSidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarSeparator,
} from "@/components/ui/sidebar";

const mainNavItems = [
    { to: "/", label: "Dashboard", icon: LayoutDashboard },
];

const orgNavItems = [
    { to: "/members", label: "Members", icon: UsersRound },
    { to: "/settings", label: "Settings", icon: Settings },
];

const systemNavItems = [
    { to: "/system/users", label: "Users", icon: Users },
];

export function AppSidebar() {
    const location = useLocation();
    const { user } = useAuth();
    const isAdmin = user?.role === "admin";

    function isActive(to: string): boolean {
        return to === "/"
            ? location.pathname === "/"
            : location.pathname.startsWith(to);
    }

    return (
        <ShadcnSidebar variant="inset">
            <SidebarHeader className="px-4 py-4">
                <span className="text-lg font-bold tracking-tight text-primary">
                    App
                </span>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupContent>
                        <OrgSwitcher />
                    </SidebarGroupContent>
                </SidebarGroup>

                <SidebarSeparator />

                <SidebarGroup>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {mainNavItems.map(({ to, label, icon: Icon }) => (
                                <SidebarMenuItem key={to}>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={isActive(to)}
                                        tooltip={label}
                                    >
                                        <NavLink to={to}>
                                            <Icon />
                                            <span>{label}</span>
                                        </NavLink>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                <SidebarGroup>
                    <SidebarGroupLabel>Organization</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {orgNavItems.map(({ to, label, icon: Icon }) => (
                                <SidebarMenuItem key={to}>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={isActive(to)}
                                        tooltip={label}
                                    >
                                        <NavLink to={to}>
                                            <Icon />
                                            <span>{label}</span>
                                        </NavLink>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                {isAdmin && (
                    <SidebarGroup>
                        <SidebarGroupLabel>System</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {systemNavItems.map(
                                    ({ to, label, icon: Icon }) => (
                                        <SidebarMenuItem key={to}>
                                            <SidebarMenuButton
                                                asChild
                                                isActive={isActive(to)}
                                                tooltip={label}
                                            >
                                                <NavLink to={to}>
                                                    <Icon />
                                                    <span>{label}</span>
                                                </NavLink>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    ),
                                )}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                )}
            </SidebarContent>
        </ShadcnSidebar>
    );
}
