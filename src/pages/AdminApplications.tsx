import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/Layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, X, Clock, Eye, GraduationCap, Star } from 'lucide-react';
import { format } from 'date-fns';

interface TutorApplication {
  id: string;
  user_id: string;
  education: string;
  experience_years: number;
  hourly_rate: number;
  languages: string[];
  certifications: string[];
  status: string;
  created_at: string;
  approved_at: string | null;
  profile: {
    first_name: string;
    last_name: string;
    email: string;
    bio: string;
    avatar_url: string;
  };
  subjects: Array<{
    proficiency_level: string;
    subject: {
      name: string;
      category: string;
    };
  }>;
}

const AdminApplications = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [applications, setApplications] = useState<TutorApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState<TutorApplication | null>(null);

  useEffect(() => {
    if (user) {
      fetchApplications();
    }
  }, [user]);

  const fetchApplications = async () => {
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

      // Fetch tutor applications
      const { data, error } = await supabase
        .from('tutors')
        .select(`
          *,
          profile:profiles!tutors_user_id_fkey(first_name, last_name, email, bio, avatar_url),
          subjects:tutor_subjects(
            proficiency_level,
            subject:subjects(name, category)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setApplications(data || []);
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast({
        title: "Error",
        description: "Failed to load tutor applications.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateApplicationStatus = async (applicationId: string, status: string) => {
    try {
      const updates: any = { status };
      if (status === 'approved') {
        updates.approved_at = new Date().toISOString();
        updates.approved_by = user!.id;
      }

      const { error } = await supabase
        .from('tutors')
        .update(updates)
        .eq('id', applicationId);

      if (error) throw error;

      toast({
        title: "Application Updated",
        description: `Application has been ${status}.`,
      });

      fetchApplications();
      setSelectedApplication(null);
    } catch (error) {
      console.error('Error updating application:', error);
      toast({
        title: "Error",
        description: "Failed to update application status.",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'rejected': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getTutorName = (application: TutorApplication) => {
    const profile = application.profile;
    return `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Tutor';
  };

  const filterApplications = (status: string) => {
    if (status === 'all') return applications;
    return applications.filter(app => app.status === status);
  };

  const ApplicationCard = ({ application }: { application: TutorApplication }) => (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={application.profile?.avatar_url} />
              <AvatarFallback>
                {getTutorName(application)[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">{getTutorName(application)}</CardTitle>
              <p className="text-sm text-muted-foreground">{application.profile?.email}</p>
              <p className="text-sm text-muted-foreground">
                Applied on {format(new Date(application.created_at), 'MMM d, yyyy')}
              </p>
            </div>
          </div>
          <Badge className={`${getStatusColor(application.status)} text-white`}>
            {application.status.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Experience:</span> {application.experience_years} years
          </div>
          <div>
            <span className="font-medium">Rate:</span> ${application.hourly_rate}/hour
          </div>
        </div>

        <div>
          <div className="font-medium text-sm mb-2">Subjects ({application.subjects.length})</div>
          <div className="flex flex-wrap gap-2">
            {application.subjects.slice(0, 3).map((ts, index) => (
              <Badge key={index} variant="secondary">
                {ts.subject.name}
              </Badge>
            ))}
            {application.subjects.length > 3 && (
              <Badge variant="outline">
                +{application.subjects.length - 3} more
              </Badge>
            )}
          </div>
        </div>

        <div className="flex space-x-2 pt-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" onClick={() => setSelectedApplication(application)}>
                <Eye className="mr-2 h-4 w-4" />
                Review
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Tutor Application Review</DialogTitle>
              </DialogHeader>
              {selectedApplication && (
                <div className="space-y-6">
                  {/* Basic Info */}
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={selectedApplication.profile?.avatar_url} />
                      <AvatarFallback className="text-lg">
                        {getTutorName(selectedApplication)[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-xl font-semibold">{getTutorName(selectedApplication)}</h3>
                      <p className="text-muted-foreground">{selectedApplication.profile?.email}</p>
                      <Badge className={`${getStatusColor(selectedApplication.status)} text-white mt-2`}>
                        {selectedApplication.status.toUpperCase()}
                      </Badge>
                    </div>
                  </div>

                  {/* Education & Experience */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Education Background</h4>
                      <p className="text-sm text-muted-foreground">
                        {selectedApplication.education || 'Not provided'}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium mb-1">Experience</h4>
                        <p className="text-sm">{selectedApplication.experience_years} years</p>
                      </div>
                      <div>
                        <h4 className="font-medium mb-1">Hourly Rate</h4>
                        <p className="text-sm">${selectedApplication.hourly_rate}/hour</p>
                      </div>
                    </div>
                  </div>

                  {/* Bio */}
                  {selectedApplication.profile?.bio && (
                    <div>
                      <h4 className="font-medium mb-2">Bio</h4>
                      <p className="text-sm text-muted-foreground">
                        {selectedApplication.profile.bio}
                      </p>
                    </div>
                  )}

                  {/* Languages */}
                  <div>
                    <h4 className="font-medium mb-2">Languages</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedApplication.languages.map((language, index) => (
                        <Badge key={index} variant="outline">
                          {language}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Subjects */}
                  <div>
                    <h4 className="font-medium mb-2">Subjects to Teach</h4>
                    <div className="grid grid-cols-1 gap-2">
                      {selectedApplication.subjects.map((ts, index) => (
                        <div key={index} className="flex justify-between items-center p-2 border rounded">
                          <span>{ts.subject.name}</span>
                          <div className="flex items-center space-x-2">
                            <Badge variant="secondary">{ts.subject.category}</Badge>
                            <Badge variant="outline">{ts.proficiency_level}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Certifications */}
                  {selectedApplication.certifications.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Certifications</h4>
                      <div className="space-y-1">
                        {selectedApplication.certifications.filter(c => c.trim()).map((cert, index) => (
                          <div key={index} className="text-sm p-2 bg-muted rounded">
                            {cert}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  {selectedApplication.status === 'pending' && (
                    <div className="flex space-x-2 pt-4">
                      <Button
                        onClick={() => updateApplicationStatus(selectedApplication.id, 'approved')}
                        className="flex-1"
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => updateApplicationStatus(selectedApplication.id, 'rejected')}
                        className="flex-1"
                      >
                        <X className="mr-2 h-4 w-4" />
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>

          {application.status === 'pending' && (
            <>
              <Button
                size="sm"
                onClick={() => updateApplicationStatus(application.id, 'approved')}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Approve
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => updateApplicationStatus(application.id, 'rejected')}
              >
                <X className="mr-2 h-4 w-4" />
                Reject
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <GraduationCap className="h-8 w-8 animate-pulse" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Tutor Applications</h1>
          <p className="text-muted-foreground">Review and manage tutor applications</p>
        </div>

        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList>
            <TabsTrigger value="pending">
              Pending ({filterApplications('pending').length})
            </TabsTrigger>
            <TabsTrigger value="approved">
              Approved ({filterApplications('approved').length})
            </TabsTrigger>
            <TabsTrigger value="rejected">
              Rejected ({filterApplications('rejected').length})
            </TabsTrigger>
            <TabsTrigger value="all">
              All ({applications.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filterApplications('pending').map(application => (
                <ApplicationCard key={application.id} application={application} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="approved" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filterApplications('approved').map(application => (
                <ApplicationCard key={application.id} application={application} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="rejected" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filterApplications('rejected').map(application => (
                <ApplicationCard key={application.id} application={application} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="all" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {applications.map(application => (
                <ApplicationCard key={application.id} application={application} />
              ))}
            </div>
          </TabsContent>

          {applications.length === 0 && (
            <div className="text-center py-12">
              <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No applications yet</h3>
              <p className="text-muted-foreground">
                Tutor applications will appear here when users apply to become tutors
              </p>
            </div>
          )}
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default AdminApplications;