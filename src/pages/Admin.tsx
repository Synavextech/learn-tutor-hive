import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/Layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Users, GraduationCap, BookOpen, DollarSign, TrendingUp, Calendar } from 'lucide-react';

interface AdminStats {
  totalUsers: number;
  totalTutors: number;
  pendingApplications: number;
  approvedTutors: number;
  totalSessions: number;
  completedSessions: number;
  totalRevenue: number;
  thisMonthRevenue: number;
}

const Admin = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalTutors: 0,
    pendingApplications: 0,
    approvedTutors: 0,
    totalSessions: 0,
    completedSessions: 0,
    totalRevenue: 0,
    thisMonthRevenue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchAdminStats();
    }
  }, [user]);

  const fetchAdminStats = async () => {
    try {
      // Check if user has admin role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user!.id)
        .eq('role', 'admin')
        .single();

      if (roleError || !roleData) {
        toast({
          title: "Access Denied",
          description: "You don't have admin privileges.",
          variant: "destructive",
        });
        return;
      }

      // Fetch user count
      const { count: userCount, error: userError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      if (userError) throw userError;

      // Fetch tutor stats
      const { data: tutorData, error: tutorError } = await supabase
        .from('tutors')
        .select('status');

      if (tutorError) throw tutorError;

      const totalTutors = tutorData?.length || 0;
      const pendingApplications = tutorData?.filter(t => t.status === 'pending').length || 0;
      const approvedTutors = tutorData?.filter(t => t.status === 'approved').length || 0;

      // Fetch session stats
      const { data: sessionData, error: sessionError } = await supabase
        .from('tutoring_sessions')
        .select('status');

      if (sessionError) throw sessionError;

      const totalSessions = sessionData?.length || 0;
      const completedSessions = sessionData?.filter(s => s.status === 'completed').length || 0;

      // Fetch payment stats
      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .select('amount, status, created_at')
        .eq('status', 'completed');

      if (paymentError) throw paymentError;

      const totalRevenue = paymentData?.reduce((sum, p) => sum + p.amount, 0) || 0;
      
      const thisMonth = new Date();
      thisMonth.setDate(1);
      const thisMonthRevenue = paymentData?.filter(p => 
        new Date(p.created_at) >= thisMonth
      ).reduce((sum, p) => sum + p.amount, 0) || 0;

      setStats({
        totalUsers: userCount || 0,
        totalTutors,
        pendingApplications,
        approvedTutors,
        totalSessions,
        completedSessions,
        totalRevenue,
        thisMonthRevenue,
      });

    } catch (error) {
      console.error('Error fetching admin stats:', error);
      toast({
        title: "Error",
        description: "Failed to load admin dashboard data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <TrendingUp className="h-8 w-8 animate-pulse" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Platform overview and management</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <Users className="h-8 w-8 text-primary" />
                <div>
                  <div className="text-2xl font-bold">{stats.totalUsers}</div>
                  <div className="text-sm text-muted-foreground">Total Users</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <GraduationCap className="h-8 w-8 text-primary" />
                <div>
                  <div className="text-2xl font-bold">{stats.approvedTutors}</div>
                  <div className="text-sm text-muted-foreground">Active Tutors</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <BookOpen className="h-8 w-8 text-primary" />
                <div>
                  <div className="text-2xl font-bold">{stats.completedSessions}</div>
                  <div className="text-sm text-muted-foreground">Completed Sessions</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-8 w-8 text-primary" />
                <div>
                  <div className="text-2xl font-bold">${stats.totalRevenue}</div>
                  <div className="text-sm text-muted-foreground">Total Revenue</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tutor Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <GraduationCap className="h-5 w-5" />
                <span>Tutor Management</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{stats.totalTutors}</div>
                  <div className="text-sm text-muted-foreground">Total Applications</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{stats.pendingApplications}</div>
                  <div className="text-sm text-muted-foreground">Pending Review</div>
                </div>
              </div>
              {stats.pendingApplications > 0 && (
                <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="text-sm text-yellow-800">
                    {stats.pendingApplications} tutor application{stats.pendingApplications > 1 ? 's' : ''} 
                    {' '}waiting for review
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Session Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BookOpen className="h-5 w-5" />
                <span>Session Overview</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{stats.totalSessions}</div>
                  <div className="text-sm text-muted-foreground">Total Sessions</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.completedSessions}</div>
                  <div className="text-sm text-muted-foreground">Completed</div>
                </div>
              </div>
              <div className="text-center">
                <div className="text-lg text-muted-foreground">
                  {stats.totalSessions > 0 
                    ? `${Math.round((stats.completedSessions / stats.totalSessions) * 100)}% completion rate`
                    : 'No sessions yet'
                  }
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Revenue Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5" />
                <span>Revenue Overview</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">${stats.totalRevenue}</div>
                  <div className="text-sm text-muted-foreground">All Time</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">${stats.thisMonthRevenue}</div>
                  <div className="text-sm text-muted-foreground">This Month</div>
                </div>
              </div>
              <div className="text-center">
                <div className="text-lg text-muted-foreground">
                  {stats.completedSessions > 0 
                    ? `$${Math.round(stats.totalRevenue / stats.completedSessions)} avg per session`
                    : 'No revenue yet'
                  }
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>Quick Actions</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between items-center p-3 border rounded-lg hover:bg-accent cursor-pointer">
                  <span>Review Tutor Applications</span>
                  <span className="text-sm text-muted-foreground">
                    {stats.pendingApplications} pending
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 border rounded-lg hover:bg-accent cursor-pointer">
                  <span>Manage Users</span>
                  <span className="text-sm text-muted-foreground">
                    {stats.totalUsers} total
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 border rounded-lg hover:bg-accent cursor-pointer">
                  <span>View All Sessions</span>
                  <span className="text-sm text-muted-foreground">
                    {stats.totalSessions} total
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Platform Health */}
        <Card>
          <CardHeader>
            <CardTitle>Platform Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  {stats.totalUsers > 0 && stats.approvedTutors > 0 ? '✓' : '⚠'}
                </div>
                <div className="text-sm text-muted-foreground mt-2">
                  {stats.totalUsers > 0 && stats.approvedTutors > 0 
                    ? 'Platform Active' 
                    : 'Needs Tutors'
                  }
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {Math.round((stats.completedSessions / Math.max(stats.totalSessions, 1)) * 100)}%
                </div>
                <div className="text-sm text-muted-foreground mt-2">Session Success Rate</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">
                  {stats.approvedTutors > 0 ? Math.round(stats.totalUsers / stats.approvedTutors) : 0}:1
                </div>
                <div className="text-sm text-muted-foreground mt-2">Student to Tutor Ratio</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Admin;