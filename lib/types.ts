export interface Client {
  id: string;
  name: string;
  description: string | null;
  website_url: string | null;
  tags: string[];
  last_updated: string;
  created_at: string;
}

export type MomentType = "feedback" | "update";

export interface FeedbackMoment {
  id: string;
  client_id: string;
  type: MomentType;
  title: string;
  date: string;
  original_images: string[];
  motivation_original: string | null;
  feedback_text: string | null;
  new_images: string[];
  motivation_new: string | null;
  reflection_text: string | null;
  body_text: string | null;
  created_at: string;
  updated_at: string;
}
