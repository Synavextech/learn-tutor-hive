import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/Layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Search, Users, Shield, UserCheck, UserX, Eye } from 'lucide-react';
import { format } from 'date-fns';

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  bio: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  roles?: Array<{
    role: string;
  }>;
  tutor?: {
    status: string;
    hourly_rate: number | null;
    experience_years: number | null;
  };
  session_count?: number;
}

const AdminUsers = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  useEffect(() => {
    if (user) {
      fetchUsers();
    }
  }, [user]);

  const fetchUsers = async () => {
    try {
      // Check admin permissions
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

      // Fetch all user profiles
      const { data: profilesData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profileError) throw profileError;

      // Get user IDs to fetch roles and tutor info
      const userIds = profilesData?.map(p => p.user_id) || [];
      
      // Fetch user roles
      let rolesData: any[] = [];
      if (userIds.length > 0) {
        const { data: roles, error: rolesError } = await supabase
          .from('user_roles')
          .select('user_id, role')
          .in('user_id', userIds);
        
        if (!rolesError) {
          rolesData = roles || [];
        }
      }

      // Fetch tutor data
      let tutorData: any[] = [];
      if (userIds.length > 0) {
        const { data: tutors, error: tutorError } = await supabase
          .from('tutors')
          .select('user_id, status, hourly_rate, experience_years')
          .in('user_id', userIds);
        
        if (!tutorError) {
          tutorData = tutors || [];
        }
      }

      // Fetch session counts
      let sessionCounts: any[] = [];
      if (userIds.length > 0) {
        const { data: sessions, error: sessionError } = await supabase
          .from('tutoring_sessions')
          .select('learner_id')
          .in('learner_id', userIds);
        
        if (!sessionError) {
          sessionCounts = sessions || [];
        }
      }

      // Process the data to combine everything
      const processedUsers = profilesData?.map(profile => ({
        ...profile,
        roles: rolesData.filter(r => r.user_id === profile.user_id),
        tutor: tutorData.find(t => t.user_id === profile.user_id),
        session_count: sessionCounts.filter(s => s.learner_id === profile.user_id).length,
      })) || [];

      setUsers(processedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to load users.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getUserName = (user: UserProfile) => {
    return `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'User';
  };

  const getUserRoles = (user: UserProfile) => {
    return user.roles?.map(r => r.role) || [];
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-500';
      case 'tutor': return 'bg-blue-500';
      case 'learner': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getUserName(user).toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === 'all' || 
      getUserRoles(user).includes(roleFilter);

    return matchesSearch && matchesRole;
  });

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Users className="h-8 w-8 animate-pulse" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">Manage platform users and their roles</p>
        </div>

        {/* Filters and Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="md:col-span-2">
            <CardContent className="pt-6">
              <div className="flex space-x-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="learner">Learners</SelectItem>
                    <SelectItem value="tutor">Tutors</SelectItem>
                    <SelectItem value="admin">Admins</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{users.length}</div>
                <div className="text-sm text-muted-foreground">Total Users</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {users.filter(u => getUserRoles(u).includes('tutor')).length}
                </div>
                <div className="text-sm text-muted-foreground">Tutors</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Users Table/Grid */}
        <Card>
          <CardHeader>
            <CardTitle>Users ({filteredUsers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredUsers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No users found</h3>
                <p className="text-muted-foreground">
                  {users.length === 0 
                    ? "No users have registered yet"
                    : "Try adjusting your search criteria"
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredUsers.map(userProfile => (
                  <Card key={userProfile.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-4">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={userProfile.avatar_url} />
                            <AvatarFallback>
                              {getUserName(userProfile)[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <h3 className="font-medium">{getUserName(userProfile)}</h3>
                              <div className="flex space-x-1">
                                {getUserRoles(userProfile).map(role => (
                                  <Badge key={role} className={`${getRoleColor(role)} text-white text-xs`}>
                                    {role}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground">{userProfile.email}</p>
                            {userProfile.phone && (
                              <p className="text-xs text-muted-foreground">{userProfile.phone}</p>
                            )}
                          </div>
                        </div>

                        <div className="text-right space-y-1">
                          <div className="text-sm text-muted-foreground">
                            Joined {format(new Date(userProfile.created_at), 'MMM d, yyyy')}
                          </div>
                          {userProfile.tutor && (
                            <div className="text-xs">
                              <Badge variant={userProfile.tutor.status === 'approved' ? 'default' : 'secondary'}>
                                Tutor: {userProfile.tutor.status}
                              </Badge>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                        {userProfile.bio && (
                          <div className="md:col-span-2">
                            <div className="font-medium">Bio</div>
                            <div className="text-muted-foreground line-clamp-2">{userProfile.bio}</div>
                          </div>
                        )}
                        
                        <div>
                          <div className="font-medium">Sessions</div>
                          <div className="text-muted-foreground">{userProfile.session_count || 0} total</div>
                        </div>

                        {userProfile.tutor && (
                          <div>
                            <div className="font-medium">Tutor Rate</div>
                            <div className="text-muted-foreground">
                              ${userProfile.tutor.hourly_rate || 0}/hour
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 flex space-x-2">
                        <Button variant="outline" size="sm">
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </Button>
                        <Button variant="outline" size="sm">
                          <Shield className="mr-2 h-4 w-4" />
                          Manage Roles
                        </Button>
                        {userProfile.tutor && userProfile.tutor.status === 'pending' && (
                          <Button size="sm">
                            <UserCheck className="mr-2 h-4 w-4" />
                            Review Application
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">
                  {users.filter(u => getUserRoles(u).includes('learner')).length}
                </div>
                <div className="text-sm text-muted-foreground">Learners</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600">
                  {users.filter(u => u.tutor?.status === 'approved').length}
                </div>
                <div className="text-sm text-muted-foreground">Active Tutors</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-lg font-bold text-yellow-600">
                  {users.filter(u => u.tutor?.status === 'pending').length}
                </div>
                <div className="text-sm text-muted-foreground">Pending Tutors</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-lg font-bold text-red-600">
                  {users.filter(u => getUserRoles(u).includes('admin')).length}
                </div>
                <div className="text-sm text-muted-foreground">Admins</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default AdminUsers;