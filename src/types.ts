export interface RelatedArticle {
  title: string;
  type: string;
  journal: string;
  shortDescription: string;
  pmid?: string;
  url?: string;
}

export interface Paper {
  id: string;
  title: string;
  journal: string;
  date: string;
  keywords: string[];
  shortSummary: string;
  detailedSummary?: string;
  url: string;
  relatedArticles?: RelatedArticle[];
  imageCategory?: 'endoscopy' | 'radiology' | 'surgery' | 'laboratory' | 'clinical' | 'none';
}

export interface UserPreferences {
  specialties: string[];
  subTopics: Record<string, string[]>;
  journals: string[];
  subscriptions: string[];
  history: Paper[];
  topicWeights: Record<string, number>;
}

export interface Comment {
  id: string;
  user_id: string;
  paper_id: string;
  paper_title: string;
  content: string;
  created_at: string;
  profiles?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

export interface PaperVote {
  id: string;
  user_id: string;
  paper_id: string;
  vote: 1 | -1;
  created_at: string;
}
