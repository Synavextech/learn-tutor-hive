import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Users, Star, Clock, GraduationCap, PenTool, Newspaper, Laptop } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-cloud-white">
      {/* Header */}
      <header className="border-b bg-cloud-white">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BookOpen className="h-8 w-8 text-royal-blue" />
              <h1 className="text-2xl font-bold text-royal-blue">WiseWorldTutors</h1>
            </div>
            <div className="flex space-x-4">
              <Button variant="ghost" className="text-navy-night hover:text-royal-blue" onClick={() => window.location.href = '/find-tutors'}>Find Tutors</Button>
              <Button variant="ghost" className="text-navy-night hover:text-royal-blue" onClick={() => window.location.href = '/auth?role=tutor&mode=signup'}>Become a Tutor</Button>
              <Button variant="outline" className="border-royal-blue text-royal-blue hover:bg-royal-blue hover:text-white" onClick={() => window.location.href = '/auth?mode=login'}>Login/Register</Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section
        className="py-20 relative bg-cover bg-center"
        style={{ backgroundImage: "url('/images/tutor.gif')" }}
      >
        <div className="absolute inset-0 bg-navy-night/80 mix-blend-multiply"></div>
        <div className="container mx-auto px-4 text-center relative z-10">
          <h2 className="text-5xl font-bold text-cloud-white mb-6">
            Connect with Expert Tutors
            <br />
            <span className="text-ice-blue">Learn Anything, Anywhere with the guide of expert tutors</span>
          </h2>
          <p className="text-xl text-ice-blue/90 mb-8">
            Join thousands of students and tutors on WiseWorldTutors. Find personalized learning experiences or share your expertise with learners around the world.
          </p>
          <div className="flex justify-center gap-4">
            <Button size="lg" className="px-8 bg-royal-blue hover:bg-royal-blue/90 text-white" onClick={() => window.location.href = '/find-tutors'}>Find a Tutor</Button>
            <Button size="lg" variant="outline" className="px-8 border-white text-white hover:bg-white hover:text-navy-night" onClick={() => window.location.href = '/auth?role=tutor&mode=signup'}>Become a Tutor</Button>
          </div>
        </div>
      </section>

      {/* about services sec */}
      <section className="py-16 bg-ice-blue">
        <div className="container mx-auto px-4">
          <h3 className="text-3xl font-bold text-center mb-12 text-navy-night">Know More about our services</h3>
          <div className="grid md:grid-cols-4 gap-8">
            <Card className="bg-cloud-white border-none shadow-md">
              <CardHeader>
                <GraduationCap className="h-12 w-12 text-royal-blue mb-4" />
                <CardTitle className="text-navy-night">Academic tutoring</CardTitle>
                <CardDescription className="text-soft-slate"> Empower your educational journey with our professional academic tutoring. Here personalized learning strategies and expert mentorship converge to help students master even the most challenging subjects. Our dedicated tutors focus on identifying unique learning gaps and fostering a deep understanding of core concepts, ensuring that every session builds both academic proficiency and the self-assurance needed to excel in rigorous environments. We employ a supportive, student-centered approach to provide essential tools for sustained academic success, helping learners reach their full potential and achieve their highest goals with confidence.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="bg-cloud-white border-none shadow-md">
              <CardHeader>
                <PenTool className="h-12 w-12 text-royal-blue mb-4" />
                <CardTitle className="text-navy-night">Expert essay writing</CardTitle>
                <CardDescription className="text-soft-slate"> Elevate your academic performance with our professional essay writing services, where expert insights meet meticulous craftsmanship to deliver high-quality, custom-tailored content. Our dedicated team of seasoned writers specializes in transforming complex ideas into compelling, well-researched narratives that adhere to the highest academic standards and rigorous deadlines. By prioritizing originality, clarity, and persuasive depth, we empower you to submit work with absolute confidence, ensuring your unique voice resonates while achieving the excellence you deserve.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="bg-cloud-white border-none shadow-md">
              <CardHeader>
                <Newspaper className="h-12 w-12 text-royal-blue mb-4" />
                <CardTitle className="text-navy-night">Article writing</CardTitle>
                <CardDescription className="text-soft-slate"> Experience the impact  our professional article writing services, where we blend rigorous research with sophisticated prose to elevate your brand’s intellectual footprint. Our team of expert wordsmiths excels at distilling complex industry concepts into clear, persuasive, and insightful long-form content that resonates with discerning readers and search engines alike. By prioritizing factual accuracy and a strategic marketing narrative, we deliver polished articles that reinforce your credibility, drive sustained engagement, and establish your business as a premier voice within your niche.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="bg-cloud-white border-none shadow-md">
              <CardHeader>
                <Laptop className="h-12 w-12 text-royal-blue mb-4" />
                <CardTitle className="text-navy-night">Blog writing</CardTitle>
                <CardDescription className="text-soft-slate"> Experience professional blog writing services, your blogs are meticulously designed to boost your brand’s authority and foster meaningful engagement with your target audience. Our expert writers combine strategic SEO integration with captivating narratives to deliver high-quality content that not only drives organic traffic but also builds lasting trust and credibility in an ever-evolving marketplace. By consistently providing fresh, insightful, and share-worthy perspectives tailored to your brand’s unique voice, we help you transform casual readers into loyal customers while positioning your business as an industry thought leader.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>


      {/* Features Section */}
      <section className="py-16 bg-cloud-white">
        <div className="container mx-auto px-4">
          <h3 className="text-3xl font-bold text-center mb-12 text-navy-night">Why Choose WiseWorldTutors?</h3>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="bg-ice-blue border-none">
              <CardHeader>
                <Users className="h-12 w-12 text-royal-blue mb-4" />
                <CardTitle className="text-navy-night">Expert Tutors</CardTitle>
                <CardDescription className="text-soft-slate">
                  Connect with qualified tutors from around the world who are passionate about teaching.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="bg-ice-blue border-none">
              <CardHeader>
                <Clock className="h-12 w-12 text-royal-blue mb-4" />
                <CardTitle className="text-navy-night">Flexible Learning</CardTitle>
                <CardDescription className="text-soft-slate">
                  Learn at your own pace with scheduling that fits your lifestyle and commitments.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="bg-ice-blue border-none">
              <CardHeader>
                <Star className="h-12 w-12 text-royal-blue mb-4" />
                <CardTitle className="text-navy-night">Quality Guaranteed</CardTitle>
                <CardDescription className="text-soft-slate">
                  All tutors are verified and rated by students to ensure the highest quality learning experience.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Sections */}
      <section className="py-16 bg-navy-night">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12">
            <Card className="bg-cloud-white text-navy-night">
              <CardHeader>
                <CardTitle className="text-2xl">For Learners</CardTitle>
                <CardDescription className="text-lg text-soft-slate">
                  Find the perfect tutor for your learning goals
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-soft-slate">
                  <li>• Browse tutors by subject and expertise</li>
                  <li>• Read reviews and ratings from other students</li>
                  <li>• Schedule sessions that fit your availability</li>
                  <li>• Track your learning progress</li>
                </ul>
                <Button className="w-full bg-royal-blue hover:bg-royal-blue/90 text-white" onClick={() => window.location.href = '/auth?role=learner&mode=signup'}>Start Learning Today</Button>
              </CardContent>
            </Card>

            <Card className="bg-cloud-white text-navy-night">
              <CardHeader>
                <CardTitle className="text-2xl">For Tutors</CardTitle>
                <CardDescription className="text-lg text-soft-slate">
                  Share your expertise and earn money teaching
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-soft-slate">
                  <li>• Set your own rates and schedule</li>
                  <li>• Teach students from around the world</li>
                  <li>• Build your reputation with student reviews</li>
                  <li>• Access teaching tools and resources</li>
                </ul>
                <Button className="w-full" variant="outline" onClick={() => window.location.href = '/auth?role=tutor&mode=signup'}>Apply to Teach</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 bg-navy-night text-cloud-white">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BookOpen className="h-6 w-6 text-royal-blue" />
              <span className="font-semibold">WiseWorldTutors</span>
            </div>
            <p className="text-sm text-soft-slate">
              © 2024 WiseWorldTutors. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
