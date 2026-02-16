import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/Layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, GraduationCap, Plus, X, CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface Subject {
  id: string;
  name: string;
  category: string;
}

interface TutorApplication {
  id: string;
  education: string;
  experience_years: number;
  hourly_rate: number;
  languages: string[];
  certifications: string[];
  status: string;
  created_at: string;
  approved_at: string | null;
}

interface SelectedSubject {
  subject_id: string;
  subject_name: string;
  proficiency_level: string;
}

const TutorApplication = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [existingApplication, setExistingApplication] = useState<TutorApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    education: '',
    experience_years: 0,
    hourly_rate: 25,
    languages: ['English'],
    certifications: [''],
  });

  const [selectedSubjects, setSelectedSubjects] = useState<SelectedSubject[]>([]);
  const [newLanguage, setNewLanguage] = useState('');
  const [newCertification, setNewCertification] = useState('');

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      // Fetch subjects
      const { data: subjectData, error: subjectError } = await supabase
        .from('subjects')
        .select('*')
        .order('name');

      if (subjectError) throw subjectError;
      setSubjects(subjectData || []);

      // Check for existing tutor application
      const { data: tutorData, error: tutorError } = await supabase
        .from('tutors')
        .select(`
          *,
          subjects:tutor_subjects(
            subject_id,
            proficiency_level,
            subject:subjects(name)
          )
        `)
        .eq('user_id', user!.id)
        .single();

      if (tutorError && tutorError.code !== 'PGRST116') throw tutorError;

      if (tutorData) {
        setExistingApplication(tutorData);
        setFormData({
          education: tutorData.education || '',
          experience_years: tutorData.experience_years || 0,
          hourly_rate: tutorData.hourly_rate || 25,
          languages: tutorData.languages || ['English'],
          certifications: tutorData.certifications || [''],
        });

        // Set selected subjects
        const subjects = tutorData.subjects?.map((ts: any) => ({
          subject_id: ts.subject_id,
          subject_name: ts.subject.name,
          proficiency_level: ts.proficiency_level,
        })) || [];
        setSelectedSubjects(subjects);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load application data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addLanguage = () => {
    if (newLanguage.trim() && !formData.languages.includes(newLanguage.trim())) {
      setFormData(prev => ({
        ...prev,
        languages: [...prev.languages, newLanguage.trim()]
      }));
      setNewLanguage('');
    }
  };

  const removeLanguage = (language: string) => {
    setFormData(prev => ({
      ...prev,
      languages: prev.languages.filter(l => l !== language)
    }));
  };

  const addCertification = () => {
    if (newCertification.trim()) {
      setFormData(prev => ({
        ...prev,
        certifications: [...prev.certifications.filter(c => c.trim()), newCertification.trim()]
      }));
      setNewCertification('');
    }
  };

  const removeCertification = (index: number) => {
    setFormData(prev => ({
      ...prev,
      certifications: prev.certifications.filter((_, i) => i !== index)
    }));
  };

  const addSubject = (subjectId: string) => {
    const subject = subjects.find(s => s.id === subjectId);
    if (subject && !selectedSubjects.find(s => s.subject_id === subjectId)) {
      setSelectedSubjects(prev => [...prev, {
        subject_id: subjectId,
        subject_name: subject.name,
        proficiency_level: 'intermediate'
      }]);
    }
  };

  const removeSubject = (subjectId: string) => {
    setSelectedSubjects(prev => prev.filter(s => s.subject_id !== subjectId));
  };

  const updateSubjectProficiency = (subjectId: string, proficiency: string) => {
    setSelectedSubjects(prev => prev.map(s =>
      s.subject_id === subjectId ? { ...s, proficiency_level: proficiency } : s
    ));
  };

  const handleSubmit = async () => {
    if (selectedSubjects.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one subject to teach.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      // Create or update tutor application
      const { data: tutorData, error: tutorError } = await supabase
        .from('tutors')
        .upsert({
          user_id: user!.id,
          education: formData.education,
          experience_years: formData.experience_years,
          hourly_rate: formData.hourly_rate,
          languages: formData.languages.filter(l => l.trim()),
          certifications: formData.certifications.filter(c => c.trim()),
          status: (existingApplication ? existingApplication.status : 'pending') as 'pending' | 'approved' | 'rejected' | 'suspended',
        })
        .select()
        .single();

      if (tutorError) throw tutorError;

      // Update tutor subjects
      // First delete existing subjects
      await supabase
        .from('tutor_subjects')
        .delete()
        .eq('tutor_id', tutorData.id);

      // Insert new subjects
      const subjectInserts = selectedSubjects.map(s => ({
        tutor_id: tutorData.id,
        subject_id: s.subject_id,
        proficiency_level: s.proficiency_level,
      }));

      const { error: subjectError } = await supabase
        .from('tutor_subjects')
        .insert(subjectInserts);

      if (subjectError) throw subjectError;

      toast({
        title: "Application Submitted",
        description: existingApplication
          ? "Your tutor application has been updated."
          : "Your tutor application has been submitted for review.",
      });

      fetchData();
    } catch (error) {
      console.error('Error submitting application:', error);
      toast({
        title: "Error",
        description: "Failed to submit application. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'pending': return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'rejected': return <AlertCircle className="h-5 w-5 text-red-500" />;
      default: return <Clock className="h-5 w-5 text-gray-500" />;
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

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center space-x-4">
          <GraduationCap className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Tutor Application</h1>
            <p className="text-muted-foreground">
              {existingApplication ? 'Update your tutor profile' : 'Apply to become a tutor'}
            </p>
          </div>
        </div>

        {existingApplication && (
          <Card className="border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(existingApplication.status)}
                  <div>
                    <div className="font-medium">Application Status</div>
                    <div className="text-sm text-muted-foreground">
                      Submitted on {new Date(existingApplication.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <Badge className={`${getStatusColor(existingApplication.status)} text-white`}>
                  {existingApplication.status.toUpperCase()}
                </Badge>
              </div>
              {existingApplication.status === 'approved' && existingApplication.approved_at && (
                <div className="mt-2 text-sm text-green-600">
                  Approved on {new Date(existingApplication.approved_at).toLocaleDateString()}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="education">Education Background</Label>
              <Textarea
                id="education"
                value={formData.education}
                onChange={(e) => setFormData(prev => ({ ...prev, education: e.target.value }))}
                placeholder="Describe your educational background, degrees, and relevant qualifications..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="experience">Years of Experience</Label>
                <Input
                  id="experience"
                  type="number"
                  min="0"
                  value={formData.experience_years}
                  onChange={(e) => setFormData(prev => ({ ...prev, experience_years: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rate">Hourly Rate (USD)</Label>
                <Input
                  id="rate"
                  type="number"
                  min="10"
                  value={formData.hourly_rate}
                  onChange={(e) => setFormData(prev => ({ ...prev, hourly_rate: parseInt(e.target.value) || 25 }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Languages */}
        <Card>
          <CardHeader>
            <CardTitle>Languages</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {formData.languages.map((language, index) => (
                <Badge key={index} variant="secondary" className="flex items-center space-x-1">
                  <span>{language}</span>
                  {language !== 'English' && (
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => removeLanguage(language)}
                    />
                  )}
                </Badge>
              ))}
            </div>
            <div className="flex space-x-2">
              <Input
                placeholder="Add a language"
                value={newLanguage}
                onChange={(e) => setNewLanguage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addLanguage()}
              />
              <Button onClick={addLanguage} variant="outline">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Subjects to Teach */}
        <Card>
          <CardHeader>
            <CardTitle>Subjects to Teach</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              {selectedSubjects.map((subject) => (
                <div key={subject.subject_id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">{subject.subject_name}</div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Select
                      value={subject.proficiency_level}
                      onValueChange={(value) => updateSubjectProficiency(subject.subject_id, value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                        <SelectItem value="expert">Expert</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSubject(subject.subject_id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <Select onValueChange={addSubject}>
              <SelectTrigger>
                <SelectValue placeholder="Add a subject" />
              </SelectTrigger>
              <SelectContent>
                {subjects
                  .filter(subject => !selectedSubjects.find(s => s.subject_id === subject.id))
                  .map(subject => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name} ({subject.category})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Certifications */}
        <Card>
          <CardHeader>
            <CardTitle>Certifications (Optional)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {formData.certifications.filter(c => c.trim()).map((cert, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                  <span>{cert}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCertification(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex space-x-2">
              <Input
                placeholder="Add a certification"
                value={newCertification}
                onChange={(e) => setNewCertification(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addCertification()}
              />
              <Button onClick={addCertification} variant="outline">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <Card>
          <CardContent className="pt-6">
            <Button
              onClick={handleSubmit}
              disabled={submitting || selectedSubjects.length === 0}
              className="w-full"
              size="lg"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {existingApplication ? 'Updating...' : 'Submitting...'}
                </>
              ) : (
                existingApplication ? 'Update Application' : 'Submit Application'
              )}
            </Button>

            {selectedSubjects.length === 0 && (
              <p className="text-sm text-muted-foreground text-center mt-2">
                Please select at least one subject to teach
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default TutorApplication;