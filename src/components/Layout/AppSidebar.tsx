import { useEffect, useState } from 'react';
import { useLocation, NavLink } from 'react-router-dom';
import { 
  Home, 
  Search, 
  Calendar, 
  MessageSquare, 
  User, 
  BookOpen, 
  CreditCard,
  Settings,
  Users,
  GraduationCap,
  FileText
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface UserRole {
  role: 'learner' | 'tutor' | 'admin';
}

export const AppSidebar = () => {
  const { state } = useSidebar();
  const location = useLocation();
  const { user } = useAuth();
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const currentPath = location.pathname;
  const collapsed = state === 'collapsed';

  useEffect(() => {
    const fetchUserRoles = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (!error && data) {
        setUserRoles(data as UserRole[]);
      }
    };

    fetchUserRoles();
  }, [user]);

  const hasRole = (role: string) => userRoles.some(r => r.role === role);
  const isActive = (path: string) => currentPath === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground hover:text-foreground hover:bg-accent/50";

  // Common navigation items
  const commonItems = [
    { title: "Dashboard", url: "/dashboard", icon: Home },
    { title: "Profile", url: "/profile", icon: User },
    { title: "Messages", url: "/messages", icon: MessageSquare },
    { title: "Calendar", url: "/calendar", icon: Calendar },
  ];

  // Learner-specific items
  const learnerItems = [
    { title: "Find Tutors", url: "/find-tutors", icon: Search },
    { title: "My Sessions", url: "/sessions", icon: BookOpen },
    { title: "Payments", url: "/payments", icon: CreditCard },
  ];

  // Tutor-specific items
  const tutorItems = [
    { title: "My Students", url: "/students", icon: Users },
    { title: "Teaching Sessions", url: "/teaching-sessions", icon: GraduationCap },
    { title: "Earnings", url: "/earnings", icon: CreditCard },
    { title: "Application", url: "/tutor-application", icon: FileText },
  ];

  // Admin-specific items
  const adminItems = [
    { title: "Admin Panel", url: "/admin", icon: Settings },
    { title: "Tutor Applications", url: "/admin/applications", icon: FileText },
    { title: "All Users", url: "/admin/users", icon: Users },
  ];

  return (
    <Sidebar className={collapsed ? "w-14" : "w-60"} collapsible="icon">
      <SidebarContent>
        {/* Common Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {commonItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavCls}>
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Learner Navigation */}
        {hasRole('learner') && (
          <SidebarGroup>
            <SidebarGroupLabel>Learning</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {learnerItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.url} className={getNavCls}>
                        <item.icon className="mr-2 h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Tutor Navigation */}
        {hasRole('tutor') && (
          <SidebarGroup>
            <SidebarGroupLabel>Teaching</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {tutorItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.url} className={getNavCls}>
                        <item.icon className="mr-2 h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Admin Navigation */}
        {hasRole('admin') && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.url} className={getNavCls}>
                        <item.icon className="mr-2 h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
};