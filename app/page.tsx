"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Calendar, BarChart, Users, Clock, CheckSquare, ArrowRight } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6">
            Start fresh.
            <br />
            On a clean <span className="font-bold">Slate</span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Your all-in-one study planner. Stay organized, track your progress, and lock in with friends.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button asChild size="lg" className="text-lg px-8">
              <Link href="/login">
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="text-lg px-8">
              <Link href="/login">
                Sign In
              </Link>
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          <Card className="bg-card border-2 hover:border-primary transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <CheckSquare className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">Task Management</h3>
              </div>
              <p className="text-muted-foreground">
                Organize your tasks by subject with priorities and due dates. Stay on top of your workload.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-2 hover:border-primary transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">Focus Timer</h3>
              </div>
              <p className="text-muted-foreground">
                Built-in Pomodoro timer to help you stay focused and track your study sessions.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-2 hover:border-primary transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">Calendar View</h3>
              </div>
              <p className="text-muted-foreground">
                Visualize your tasks and deadlines in a clean calendar interface.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-2 hover:border-primary transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <BarChart className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">Analytics</h3>
              </div>
              <p className="text-muted-foreground">
                Track your focus time with detailed charts and insights into your study habits.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-2 hover:border-primary transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">Study Parties</h3>
              </div>
              <p className="text-muted-foreground">
                Create study groups, compete with friends, and see who's putting in the most hours.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-2 hover:border-primary transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <CheckSquare className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">Todo lists</h3>
              </div>
              <p className="text-muted-foreground">
                Quick daily task list to keep track of immediate priorities and stay productive.
              </p>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
