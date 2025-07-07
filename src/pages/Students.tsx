import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/Layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Search, Users, Calendar, MessageCircle, BookOpen, Star } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url: string;
  sessionCount: number;
  completedSessions: number;
  totalEarnings: number;
  avgRating: number;
  lastSession?: string;
  subjects: string[];
}

interface SessionWithStudent {
  id: string;
  title: string;
  scheduled_start: string;
  scheduled_end: string;
  status: string;
  rating: number | null;
  learner_id: string;
  subject: {
    name: string;
  };
  learner_profile: {
    first_name: string;
    last_name: string;
    email: string;
    avatar_url: string;
  };
  payment?: {
    amount: number;
  };
}

const Students = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user) {
      fetchStudents();
    }
  }, [user]);

  const fetchStudents = async () => {
    try {
      // First get the tutor ID
      const { data: tutorData, error: tutorError } = await supabase
        .from('tutors')
        .select('id')
        .eq('user_id', user!.id)
        .single();

      if (tutorError) throw tutorError;

      // Fetch all sessions for this tutor with learner details
      const { data: sessions, error: sessionError } = await supabase
        .from('tutoring_sessions')
        .select(`
          *,
          subject:subjects(name),
          learner_profile:profiles!tutoring_sessions_learner_id_fkey(first_name, last_name, email, avatar_url),
          payment:payments(amount)
        `)
        .eq('tutor_id', tutorData.id)
        .order('scheduled_start', { ascending: false });

      if (sessionError) throw sessionError;

      // Process sessions to create student summaries
      const studentMap = new Map<string, Student>();

      sessions?.forEach((session: SessionWithStudent) => {
        const learnerId = session.learner_id;
        const profile = session.learner_profile;
        
        if (!studentMap.has(learnerId)) {
          studentMap.set(learnerId, {
            id: learnerId,
            first_name: profile?.first_name || '',
            last_name: profile?.last_name || '',
            email: profile?.email || '',
            avatar_url: profile?.avatar_url || '',
            sessionCount: 0,
            completedSessions: 0,
            totalEarnings: 0,
            avgRating: 0,
            subjects: [],
          });
        }

        const student = studentMap.get(learnerId)!;
        student.sessionCount++;

        if (session.status === 'completed') {
          student.completedSessions++;
          if (session.payment?.amount) {
            student.totalEarnings += session.payment.amount;
          }
        }

        if (session.subject?.name && !student.subjects.includes(session.subject.name)) {
          student.subjects.push(session.subject.name);
        }

        if (!student.lastSession || session.scheduled_start > student.lastSession) {
          student.lastSession = session.scheduled_start;
        }
      });

      // Calculate average ratings
      for (const [learnerId, student] of studentMap) {
        const studentSessions = sessions?.filter(s => s.learner_id === learnerId && s.rating) || [];
        if (studentSessions.length > 0) {
          const totalRating = studentSessions.reduce((sum, s) => sum + (s.rating || 0), 0);
          student.avgRating = totalRating / studentSessions.length;
        }
      }

      setStudents(Array.from(studentMap.values()));
    } catch (error) {
      console.error('Error fetching students:', error);
      toast({
        title: "Error",
        description: "Failed to load your students.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(student => {
    const searchLower = searchTerm.toLowerCase();
    return (
      student.first_name.toLowerCase().includes(searchLower) ||
      student.last_name.toLowerCase().includes(searchLower) ||
      student.email.toLowerCase().includes(searchLower) ||
      student.subjects.some(subject => subject.toLowerCase().includes(searchLower))
    );
  });

  const getStudentName = (student: Student) => {
    return `${student.first_name} ${student.last_name}`.trim() || 'Student';
  };

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
          <h1 className="text-3xl font-bold">My Students</h1>
          <p className="text-muted-foreground">Manage and track your student relationships</p>
        </div>

        {/* Search and Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="md:col-span-2">
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search students..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{students.length}</div>
                <div className="text-sm text-muted-foreground">Total Students</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {students.reduce((sum, s) => sum + s.completedSessions, 0)}
                </div>
                <div className="text-sm text-muted-foreground">Completed Sessions</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Students Grid */}
        {filteredStudents.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">
              {students.length === 0 ? "No students yet" : "No students match your search"}
            </h3>
            <p className="text-muted-foreground">
              {students.length === 0 
                ? "Students will appear here after they book sessions with you"  
                : "Try adjusting your search criteria"
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStudents.map(student => (
              <Card key={student.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={student.avatar_url} />
                      <AvatarFallback>
                        {getStudentName(student)[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <CardTitle className="text-lg">{getStudentName(student)}</CardTitle>
                      <p className="text-sm text-muted-foreground">{student.email}</p>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="text-center">
                      <div className="font-semibold text-primary">{student.sessionCount}</div>
                      <div className="text-muted-foreground">Total Sessions</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-primary">{student.completedSessions}</div>
                      <div className="text-muted-foreground">Completed</div>
                    </div>
                  </div>

                  {student.avgRating > 0 && (
                    <div className="flex items-center justify-center space-x-2">
                      <Star className="h-4 w-4 text-yellow-500 fill-current" />
                      <span className="text-sm font-medium">{student.avgRating.toFixed(1)}/5</span>
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="font-medium text-sm">Subjects</div>
                    <div className="flex flex-wrap gap-1">
                      {student.subjects.slice(0, 3).map((subject, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {subject}
                        </Badge>
                      ))}
                      {student.subjects.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{student.subjects.length - 3}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {student.lastSession && (
                    <div className="text-sm text-muted-foreground">
                      Last session: {format(parseISO(student.lastSession), 'MMM d, yyyy')}
                    </div>
                  )}

                  <div className="text-center">
                    <div className="font-semibold text-primary">${student.totalEarnings}</div>
                    <div className="text-xs text-muted-foreground">Total Earned</div>
                  </div>

                  <div className="flex space-x-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <MessageCircle className="mr-2 h-4 w-4" />
                      Message
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Calendar className="mr-2 h-4 w-4" />
                      Sessions
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Students;