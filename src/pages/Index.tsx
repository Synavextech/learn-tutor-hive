import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Users, Star, Clock } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BookOpen className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold text-primary">WiseWorldTutors</h1>
            </div>
            <div className="flex space-x-4">
              <Button variant="ghost">Find Tutors</Button>
              <Button variant="ghost">Become a Tutor</Button>
              <Button variant="outline">Sign In</Button>
              <Button>Get Started</Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-5xl font-bold text-foreground mb-6">
            Connect with Expert Tutors
            <br />
            <span className="text-primary">Learn Anything, Anywhere</span>
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of students and tutors on WiseWorldTutors. Find personalized learning experiences 
            or share your expertise with learners around the world.
          </p>
          <div className="flex justify-center gap-4">
            <Button size="lg" className="px-8">
              Find a Tutor
            </Button>
            <Button size="lg" variant="outline" className="px-8">
              Start Teaching
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h3 className="text-3xl font-bold text-center mb-12">Why Choose WiseWorldTutors?</h3>
          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <Users className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Expert Tutors</CardTitle>
                <CardDescription>
                  Connect with qualified tutors from around the world who are passionate about teaching.
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card>
              <CardHeader>
                <Clock className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Flexible Learning</CardTitle>
                <CardDescription>
                  Learn at your own pace with scheduling that fits your lifestyle and commitments.
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card>
              <CardHeader>
                <Star className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Quality Guaranteed</CardTitle>
                <CardDescription>
                  All tutors are verified and rated by students to ensure the highest quality learning experience.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Sections */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">For Learners</CardTitle>
                <CardDescription className="text-lg">
                  Find the perfect tutor for your learning goals
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-muted-foreground">
                  <li>• Browse tutors by subject and expertise</li>
                  <li>• Read reviews and ratings from other students</li>
                  <li>• Schedule sessions that fit your availability</li>
                  <li>• Track your learning progress</li>
                </ul>
                <Button className="w-full">Start Learning Today</Button>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">For Tutors</CardTitle>
                <CardDescription className="text-lg">
                  Share your expertise and earn money teaching
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-muted-foreground">
                  <li>• Set your own rates and schedule</li>
                  <li>• Teach students from around the world</li>
                  <li>• Build your reputation with student reviews</li>
                  <li>• Access teaching tools and resources</li>
                </ul>
                <Button className="w-full" variant="outline">Apply to Teach</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BookOpen className="h-6 w-6 text-primary" />
              <span className="font-semibold">WiseWorldTutors</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 WiseWorldTutors. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
