export interface TutorialMetadataConfig {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: number; // in minutes
  roles?: string[];
  tags?: string[];
  icon?: string;
  author?: string;
  order?: number;
  sections?: TutorialSection[]; // Optional sections array
}

export interface TutorialSection {
  id?: string;
  title: string;
  duration?: number;
  completed?: boolean;
}
