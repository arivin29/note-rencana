export enum TutorialCategory {
  GETTING_STARTED = 'getting-started',
  USER_GUIDE = 'user-guide',
  ADMIN_GUIDE = 'admin-guide',
  OWNER_GUIDE = 'owner-guide',
  MODULE_DASHBOARD = 'module-dashboard',
  MODULE_OWNERS = 'module-owners',
  MODULE_PROJECTS = 'module-projects',
  MODULE_NODES = 'module-nodes',
  MODULE_SENSORS = 'module-sensors',
  MODULE_ALERTS = 'module-alerts',
  MODULE_REPORTS = 'module-reports',
  MODULE_USERS = 'module-users',
  MODULE_PROFILES = 'module-profiles',
  MODULE_NODE_MODELS = 'module-node-models',
  TROUBLESHOOTING = 'troubleshooting',
  FAQ = 'faq',
}

export enum TutorialDifficulty {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
}

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  OWNER = 'owner',
  USER = 'user',
}

export interface TutorialMetadata {
  id: string;
  title: string;
  description: string;
  category: TutorialCategory;
  difficulty: TutorialDifficulty;
  estimatedTime: number; // in minutes
  roles: UserRole[]; // which roles can access this tutorial
  tags: string[];
  order: number; // order within category
  icon?: string; // material icon name
  path?: string; // route path (e.g., 'faq/general-questions')
  author?: string;
  lastUpdated?: Date;
}

export interface TutorialSection {
  id: string;
  title: string;
  content: string; // markdown content
  order: number;
  videoUrl?: string;
  images?: string[];
  codeSnippets?: CodeSnippet[];
}

export interface CodeSnippet {
  language: string;
  code: string;
  description?: string;
}

export interface Tutorial {
  metadata: TutorialMetadata;
  sections: TutorialSection[];
}

export interface TutorialProgress {
  userId: string;
  tutorialId: string;
  completedSections: string[];
  currentSection: number;
  lastAccessedAt: Date;
  completed: boolean;
}
