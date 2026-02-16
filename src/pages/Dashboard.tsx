import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import {
  BookOpen,
  Calendar,
  MessageSquare,
  DollarSign,
  Users,
  Clock,
  TrendingUp,
  Star
} from 'lucide-react';
import { AppLayout } from '@/components/Layout/AppLayout';

interface UserRole {
  role: 'learner' | 'tutor' | 'admin';
}

interface DashboardStats {
  totalSessions: number;
  upcomingSessions: number;
  totalMessages: number;
  totalEarnings?: number;
  totalStudents?: number;
  averageRating?: number;
}

const Dashboard = () => {
  const { user } = useAuth();
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalSessions: 0,
    upcomingSessions: 0,
    totalMessages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [tutorStatus, setTutorStatus] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;

      try {
        // Fetch user roles
        const { data: rolesData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        if (rolesData) {
          setUserRoles(rolesData as UserRole[]);
        }

        // Fetch dashboard stats based on roles
        const hasLearnerRole = rolesData?.some(r => r.role === 'learner');
        const hasTutorRole = rolesData?.some(r => r.role === 'tutor');

        let sessionsQuery = supabase
          .from('tutoring_sessions')
          .select('*', { count: 'exact' });

        if (hasLearnerRole && !hasTutorRole) {
          sessionsQuery = sessionsQuery.eq('learner_id', user.id);
        } else if (hasTutorRole && !hasLearnerRole) {
          // Get tutor id first
          const { data: tutorData } = await supabase
            .from('tutors')
            .select('id, status')
            .eq('user_id', user.id)
            .single();

          if (tutorData) {
            sessionsQuery = sessionsQuery.eq('tutor_id', tutorData.id);
            setTutorStatus(tutorData.status);
          }
        }

        const { count: totalSessions } = await sessionsQuery;

        // Get upcoming sessions
        const upcomingQuery = supabase
          .from('tutoring_sessions')
          .select('*', { count: 'exact' })
          .gte('scheduled_start', new Date().toISOString())
          .eq('status', 'scheduled');

        if (hasLearnerRole && !hasTutorRole) {
          upcomingQuery.eq('learner_id', user.id);
        } else if (hasTutorRole && !hasLearnerRole) {
          const { data: tutorData } = await supabase
            .from('tutors')
            .select('id')
            .eq('user_id', user.id)
            .single();

          if (tutorData) {
            upcomingQuery.eq('tutor_id', tutorData.id);
          }
        }

        const { count: upcomingSessions } = await upcomingQuery;

        // Get message count
        const { count: totalMessages } = await supabase
          .from('messages')
          .select('*', { count: 'exact' })
          .eq('sender_id', user.id);

        setStats({
          totalSessions: totalSessions || 0,
          upcomingSessions: upcomingSessions || 0,
          totalMessages: totalMessages || 0,
        });

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user]);



  const hasRole = (role: string) => userRoles.some(r => r.role === role);

  const renderLearnerDashboard = () => (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSessions}</div>
            <p className="text-xs text-muted-foreground">Learning sessions completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Sessions</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcomingSessions}</div>
            <p className="text-xs text-muted-foreground">Sessions scheduled</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Messages Sent</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMessages}</div>
            <p className="text-xs text-muted-foreground">Chat messages</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Progress</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">92%</div>
            <p className="text-xs text-muted-foreground">Learning progress</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Get started with your learning journey</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full justify-start">
              <BookOpen className="mr-2 h-4 w-4" />
              Find a Tutor
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Calendar className="mr-2 h-4 w-4" />
              Schedule Session
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <MessageSquare className="mr-2 h-4 w-4" />
              View Messages
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest learning activities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Completed Math session</p>
                  <p className="text-xs text-muted-foreground">2 hours ago</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">New message from tutor</p>
                  <p className="text-xs text-muted-foreground">1 day ago</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Physics session scheduled</p>
                  <p className="text-xs text-muted-foreground">2 days ago</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderTutorDashboard = () => (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStudents || 0}</div>
            <p className="text-xs text-muted-foreground">Active students</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sessions Taught</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSessions}</div>
            <p className="text-xs text-muted-foreground">Teaching sessions completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalEarnings || 0}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageRating || 5.0}</div>
            <p className="text-xs text-muted-foreground">Student feedback</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Teaching Tools</CardTitle>
            <CardDescription>Manage your teaching activities</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full justify-start">
              <Calendar className="mr-2 h-4 w-4" />
              Schedule Availability
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Users className="mr-2 h-4 w-4" />
              View Students
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <DollarSign className="mr-2 h-4 w-4" />
              Earnings Report
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Sessions</CardTitle>
            <CardDescription>Your scheduled teaching sessions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Mathematics - Algebra</p>
                  <p className="text-xs text-muted-foreground">Today at 2:00 PM</p>
                </div>
                <Badge variant="outline">Scheduled</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Physics - Mechanics</p>
                  <p className="text-xs text-muted-foreground">Tomorrow at 10:00 AM</p>
                </div>
                <Badge variant="outline">Scheduled</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Clock className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading dashboard...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's what's happening with your account.
          </p>
        </div>

        {hasRole('learner') && renderLearnerDashboard()}

        {hasRole('tutor') && (
          <>
            {tutorStatus !== 'approved' ? (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                <Card className="w-full max-w-md">
                  <CardHeader>
                    <CardTitle>Complete Your Tutor Application</CardTitle>
                    <CardDescription>
                      You need to complete your tutor application to access the dashboard.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full" onClick={() => window.location.href = '/tutor-application'}>
                      Complete Application
                    </Button>
                  </CardContent>
                </Card>
              </div>
            ) : (
              renderTutorDashboard()
            )}
          </>
        )}

        {!hasRole('learner') && !hasRole('tutor') && (
          <Card>
            <CardHeader>
              <CardTitle>Welcome to WiseWorldTutors</CardTitle>
              <CardDescription>Get started by choosing your role</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-4">
                <Button>Become a Tutor</Button>
                <Button variant="outline">Find Tutors</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};

export default Dashboard;