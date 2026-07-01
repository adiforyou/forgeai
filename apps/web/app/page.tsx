"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import {
  Zap,
  Shield,
  TrendingUp,
  Code2,
  GitPullRequest,
  Clock,
  DollarSign,
  CheckCircle,
  ArrowRight,
  Github,
  Gitlab,
  Star,
} from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#2d2d2d] border-t-primary" />
      </div>
    );
  }

  if (isAuthenticated) {
    router.push("/dashboard");
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Code2 className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">Forge AI</span>
            </div>
            <nav className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Features
              </a>
              <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Pricing
              </a>
              <a href="#about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                About
              </a>
            </nav>
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/login"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 mb-6">
              <Star className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">
                AI-Powered Code Reviews
              </span>
            </div>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
              Ship Faster with{" "}
              <span className="bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
                AI Code Reviews
              </span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8 leading-relaxed">
              Automatically review pull requests with advanced AI. Catch bugs, security issues,
              and code quality problems before they reach production.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/login"
                className="group flex items-center gap-2 rounded-lg bg-primary px-8 py-3.5 text-base font-medium text-primary-foreground hover:bg-primary/90 transition-all"
              >
                Start Free Trial
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a
                href="#features"
                className="flex items-center gap-2 rounded-lg border border-border bg-card px-8 py-3.5 text-base font-medium hover:bg-accent transition-colors"
              >
                Learn More
              </a>
            </div>

            {/* Stats */}
            <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-3xl mx-auto">
              <div className="text-center">
                <div className="text-4xl font-bold text-primary mb-2">10x</div>
                <div className="text-sm text-muted-foreground">Faster Reviews</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-primary mb-2">99%</div>
                <div className="text-sm text-muted-foreground">Bug Detection</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-primary mb-2">24/7</div>
                <div className="text-sm text-muted-foreground">Automated</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Everything You Need</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Enterprise-grade AI code review platform with all the features you need
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={<Zap className="h-6 w-6" />}
              title="Lightning Fast"
              description="Get comprehensive code reviews in under 60 seconds with Gemini 2.0 Flash"
            />
            <FeatureCard
              icon={<Shield className="h-6 w-6" />}
              title="Security First"
              description="Detect security vulnerabilities, SQL injection, XSS, and other OWASP top 10 issues"
            />
            <FeatureCard
              icon={<TrendingUp className="h-6 w-6" />}
              title="Multi-Model AI"
              description="Choose from Claude 3.5, GPT-4o, or Gemini 2.0 for different review strategies"
            />
            <FeatureCard
              icon={<GitPullRequest className="h-6 w-6" />}
              title="Multi-Platform"
              description="Works with GitHub, GitLab, and Bitbucket seamlessly"
            />
            <FeatureCard
              icon={<Clock className="h-6 w-6" />}
              title="Auto Reviews"
              description="Automatically review every PR as soon as it's opened"
            />
            <FeatureCard
              icon={<DollarSign className="h-6 w-6" />}
              title="Cost Tracking"
              description="Track API costs and review analytics in real-time"
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-card/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-lg text-muted-foreground">
              Get started in minutes
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <StepCard
              number="1"
              title="Connect Repository"
              description="Link your GitHub, GitLab, or Bitbucket repository with a single click"
            />
            <StepCard
              number="2"
              title="Configure AI Model"
              description="Choose your review strategy: Fast, Thorough, or Security-Focused"
            />
            <StepCard
              number="3"
              title="Get Reviews"
              description="AI automatically reviews every PR and posts detailed feedback"
            />
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Integrations</h2>
            <p className="text-lg text-muted-foreground">
              Works with your favorite tools
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-12">
            <div className="flex items-center gap-3">
              <Github className="h-8 w-8 text-foreground" />
              <span className="text-xl font-semibold">GitHub</span>
            </div>
            <div className="flex items-center gap-3">
              <Gitlab className="h-8 w-8 text-foreground" />
              <span className="text-xl font-semibold">GitLab</span>
            </div>
            <div className="flex items-center gap-3">
              <Code2 className="h-8 w-8 text-foreground" />
              <span className="text-xl font-semibold">Bitbucket</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-4xl">
          <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/5 via-purple-500/5 to-pink-500/5 p-12 text-center">
            <h2 className="text-4xl font-bold mb-4">
              Ready to Ship Faster?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join thousands of developers using AI to catch bugs before they reach production
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-8 py-3.5 text-base font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Get Started Free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                  <Code2 className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="text-lg font-bold">Forge AI</span>
              </div>
              <p className="text-sm text-muted-foreground">
                AI-powered code review platform for modern development teams
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-3">Product</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a></li>
                <li><a href="/login" className="hover:text-foreground transition-colors">Sign In</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-3">Company</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#about" className="hover:text-foreground transition-colors">About</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-3">Legal</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Terms</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Security</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-border text-center text-sm text-muted-foreground">
            © 2026 Forge AI. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="group rounded-xl border border-border bg-card p-6 hover:border-primary/50 transition-all">
      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
        {icon}
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

function StepCard({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="relative">
      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
        {number}
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}
