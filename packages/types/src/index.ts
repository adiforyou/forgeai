// Shared types for Forge AI

export interface PRInfo {
  number: number;
  title: string;
  description: string;
  author: string;
  branch: string;
  targetBranch: string;
  url: string;
}

export interface PRDiff {
  content: string;
  additions: number;
  deletions: number;
  filesChanged: number;
}

export interface FileChange {
  path: string;
  status: 'added' | 'modified' | 'removed' | 'renamed';
  additions: number;
  deletions: number;
  patch?: string;
}

export interface ReviewFinding {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: 'security' | 'performance' | 'quality' | 'style' | 'architecture';
  title: string;
  description: string;
  file?: string;
  line?: number;
  suggestion?: string;
  codeSnippet?: string;
  fixedCode?: string;
}

export interface ReviewResult {
  summary: string;
  findings: ReviewFinding[];
  totalIssues: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  infoCount: number;
}

export interface LLMResponse {
  content: string;
  tokensUsed: {
    input: number;
    output: number;
    total: number;
  };
  costUsd: number;
  model: string;
  duration: number;
}

export type Platform = 'github' | 'gitlab' | 'bitbucket';

export type ReviewStrategy = 'single-pass' | 'multi-pass' | 'security-audit';
