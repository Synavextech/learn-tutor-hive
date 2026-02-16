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
import { Search, Star, MapPin, Clock, MessageCircle, GraduationCap, Globe, CheckCircle, BookOpen } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Tutor {
  id: string;
  user_id: string;
  hourly_rate: number;
  experience_years: number;
  education: string;
  languages: string[];
  profile?: {
    first_name: string | null;
    last_name: string | null;
    bio: string | null;
    avatar_url: string | null;
  };
  subjects: Array<{
    subject: {
      id: string;
      name: string;
      category: string;
    };
    proficiency_level: string;
  }>;
}

interface Subject {
  id: string;
  name: string;
  category: string;
}

const FindTutors = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedTutor, setSelectedTutor] = useState<Tutor | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch tutors with basic data first
      const { data: tutorData, error: tutorError } = await supabase
        .from('tutors')
        .select(`
          *,
          subjects:tutor_subjects(
            proficiency_level,
            subject:subjects(id, name, category)
          )
        `)
        .eq('status', 'approved');

      if (tutorError) throw tutorError;

      // Get unique tutor user IDs to fetch profiles
      const userIds = tutorData?.map(t => t.user_id) || [];

      let profilesData: any[] = [];
      if (userIds.length > 0) {
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name, bio, avatar_url')
          .in('user_id', userIds);

        if (!profileError) {
          profilesData = profiles || [];
        }
      }

      // Merge profiles with tutor data
      const tutorsWithProfiles = tutorData?.map(tutor => ({
        ...tutor,
        profile: profilesData.find(p => p.user_id === tutor.user_id) || null
      })) || [];

      // Fetch all subjects for filtering
      const { data: subjectData, error: subjectError } = await supabase
        .from('subjects')
        .select('*')
        .order('name');

      if (subjectError) throw subjectError;

      setTutors(tutorsWithProfiles);
      setSubjects(subjectData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load tutors.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredTutors = tutors.filter(tutor => {
    const matchesSearch =
      tutor.profile?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tutor.profile?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tutor.profile?.bio?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tutor.subjects.some(ts => ts.subject.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesSubject = !selectedSubject ||
      tutor.subjects.some(ts => ts.subject.id === selectedSubject);

    const matchesCategory = !selectedCategory ||
      tutor.subjects.some(ts => ts.subject.category === selectedCategory);

    return matchesSearch && matchesSubject && matchesCategory;
  });

  const categories = [...new Set(subjects.map(s => s.category))].filter(Boolean);

  const getTutorName = (tutor: Tutor) => {
    return `${tutor.profile?.first_name || ''} ${tutor.profile?.last_name || ''}`.trim() || 'Tutor';
  };

  const handleContactTutor = (tutorId: string) => {
    toast({
      title: "Feature Coming Soon",
      description: "Direct messaging with tutors will be available soon.",
    });
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Search className="h-8 w-8 animate-pulse" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Find Tutors</h1>
          <p className="text-muted-foreground">Discover qualified tutors for your learning needs</p>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tutors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select
                value={selectedCategory || "all"}
                onValueChange={(value) => setSelectedCategory(value === "all" ? "" : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={selectedSubject || "all"}
                onValueChange={(value) => setSelectedSubject(value === "all" ? "" : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Subjects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  {subjects
                    .filter(subject => !selectedCategory || subject.category === selectedCategory)
                    .map(subject => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedSubject('');
                  setSelectedCategory('');
                }}
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTutors.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No tutors found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search criteria or filters
              </p>
            </div>
          ) : (
            filteredTutors.map(tutor => (
              <Card key={tutor.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={tutor.profile?.avatar_url} />
                      <AvatarFallback className="text-lg">
                        {getTutorName(tutor)[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <CardTitle className="text-lg">{getTutorName(tutor)}</CardTitle>
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>{tutor.experience_years} years experience</span>
                      </div>
                      <div className="text-lg font-bold text-primary">
                        ${tutor.hourly_rate}/hour
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {tutor.profile?.bio && (
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {tutor.profile.bio}
                    </p>
                  )}

                  <div>
                    <h4 className="font-medium mb-2">Subjects</h4>
                    <div className="flex flex-wrap gap-2">
                      {tutor.subjects.slice(0, 3).map((ts, index) => (
                        <Badge key={index} variant="secondary">
                          {ts.subject.name}
                        </Badge>
                      ))}
                      {tutor.subjects.length > 3 && (
                        <Badge variant="outline">
                          +{tutor.subjects.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>

                  {tutor.languages && tutor.languages.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Languages</h4>
                      <div className="flex flex-wrap gap-2">
                        {tutor.languages.slice(0, 3).map((language, index) => (
                          <Badge key={index} variant="outline">
                            {language}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {tutor.education && (
                    <div>
                      <h4 className="font-medium mb-1">Education</h4>
                      <p className="text-sm text-muted-foreground">
                        {tutor.education}
                      </p>
                    </div>
                  )}

                  <div className="flex space-x-2 pt-2">
                    <Button className="flex-1" onClick={() => handleContactTutor(tutor.id)}>
                      <MessageCircle className="mr-2 h-4 w-4" />
                      Contact
                    </Button>
                    <Button variant="outline" onClick={() => setSelectedTutor(tutor)}>
                      View Profile
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <Dialog open={!!selectedTutor} onOpenChange={(open) => !open && setSelectedTutor(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Tutor Profile</DialogTitle>
            </DialogHeader>
            <ScrollArea className="h-full max-h-[calc(90vh-100px)] pr-4">
              {selectedTutor && (
                <div className="space-y-6">
                  {/* Header */}
                  <div className="flex flex-col md:flex-row gap-6 items-start">
                    <Avatar className="h-24 w-24">
                      <AvatarImage src={selectedTutor.profile?.avatar_url} />
                      <AvatarFallback className="text-2xl">
                        {getTutorName(selectedTutor)[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold">{getTutorName(selectedTutor)}</h2>
                      <div className="flex items-center space-x-4 mt-2 text-muted-foreground">
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          <span>{selectedTutor.experience_years} Years Exp.</span>
                        </div>
                        <div className="flex items-center text-primary font-semibold">
                          <span>${selectedTutor.hourly_rate}/hr</span>
                        </div>
                      </div>
                      {selectedTutor.profile?.bio && (
                        <p className="mt-4 text-muted-foreground leading-relaxed">
                          {selectedTutor.profile.bio}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Languages */}
                  {selectedTutor.languages && selectedTutor.languages.length > 0 && (
                    <div>
                      <h3 className="font-semibold flex items-center mb-3">
                        <Globe className="h-4 w-4 mr-2" />
                        Languages
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedTutor.languages.map((lang, i) => (
                          <Badge key={i} variant="secondary">{lang}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Education */}
                  {selectedTutor.education && (
                    <div>
                      <h3 className="font-semibold flex items-center mb-3">
                        <GraduationCap className="h-4 w-4 mr-2" />
                        Education
                      </h3>
                      <p className="text-muted-foreground">{selectedTutor.education}</p>
                    </div>
                  )}

                  {/* Subjects */}
                  <div>
                    <h3 className="font-semibold flex items-center mb-3">
                      <BookOpen className="h-4 w-4 mr-2" />
                      Subjects
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {selectedTutor.subjects.map((ts, i) => (
                        <div key={i} className="flex justify-between items-center p-3 rounded-lg border bg-card">
                          <span className="font-medium">{ts.subject.name}</span>
                          <Badge variant="outline">{ts.proficiency_level}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action */}
                  <div className="pt-4 flex justify-end">
                    <Button onClick={() => handleContactTutor(selectedTutor.id)} className="w-full md:w-auto">
                      <MessageCircle className="mr-2 h-4 w-4" />
                      Contact Tutor
                    </Button>
                  </div>
                </div>
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default FindTutors;