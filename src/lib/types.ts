export type Role = 'student' | 'admin' | 'company';

export interface AvatarConfig {
  skin: string;
  hair: 'none' | 'short' | 'long' | 'curly' | 'bun' | 'mohawk' | 'afro';
  hairColor: string;
  eyes: 'round' | 'happy' | 'wink' | 'sleepy';
  mouth: 'smile' | 'grin' | 'neutral' | 'open';
  shirt: string;
  accessory: 'none' | 'glasses' | 'sunglasses' | 'cap' | 'headphones' | 'earring';
  background: string;
  outfit?: 'tee' | 'hoodie' | 'jacket';
  pants?: string;
}

export interface LevelInfo {
  level: number;
  name: string;
  icon: string;
  min: number;
  next: number | null;
  progress: number;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  municipality: string | null;
  school: string | null;
  birth_date: string | null;
  bio: string | null;
  avatar: AvatarConfig | null;
  points: number;
  level: LevelInfo;
  created_at: string;
  company_id: number | null;
  job_title: string | null;
  /** Vitrine de talentos (opt-in) vista pelas empresas parceiras. */
  talent: {
    visible: boolean;
    headline: string | null;
    areas: string[];
    goal: string | null;
    guardian_ok: boolean;
    needs_consent: boolean;
  };
}

export interface PublicUser {
  id: number;
  name: string;
  municipality: string | null;
  school: string | null;
  bio: string | null;
  avatar: AvatarConfig | null;
  points: number;
  level: LevelInfo;
}

export interface Quest {
  code: string;
  period: 'daily' | 'weekly';
  title: string;
  icon: string;
  goal: number;
  unit: string | null;
  current: number;
  reward: number;
  completed: boolean;
  claimed: boolean;
}

export interface QuestBoard {
  daily: Quest[];
  weekly: Quest[];
  weekEndsOn: string;
}

export interface GameSummary {
  points: number;
  level: LevelInfo;
  currentStreak: number;
  bestStreak: number;
  rank: number | null;
  today: string;
  week: { day: string; studied: boolean }[];
  claimableQuests: number;
}

export interface CourseCard {
  id: number;
  title: string;
  slug: string;
  summary: string | null;
  cover_url: string | null;
  workload_hours: number;
  level: string | null;
  has_certificate: number;
  trail_id: number | null;
  trail_title: string | null;
  trail_slug: string | null;
  modules_count: number;
  lessons_count: number;
  students: number;
  rating: number | null;
  enrollment_status: 'in_progress' | 'completed' | null;
  enrollment_progress: number | null;
}

export interface Trail {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  cover_url: string | null;
  courses_count?: number;
  workload_hours?: number;
}

export interface AssessmentSummary {
  id: number;
  title: string;
  kind: 'quiz' | 'exercise';
  scope_type: 'lesson' | 'module' | 'course' | 'trail';
  scope_id: number;
  min_grade: number;
  best_score: number | null;
  passed: boolean;
  attempts: number;
}

export interface Requirement {
  key: string;
  label: string;
  met: boolean;
  detail?: string;
}

export interface CertificateStatus {
  hasCertificate: boolean;
  enrolled: boolean;
  eligible: boolean;
  canGiveFeedback: boolean;
  feedbackGiven: boolean;
  requirements: Requirement[];
  certificate: Certificate | null;
}

export interface Certificate {
  id: number;
  code: string;
  student_name: string;
  course_title: string;
  course_slug?: string;
  workload_hours: number;
  final_grade: number | null;
  issued_at: string;
}

export interface Notification {
  id: number;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

export interface Badge {
  code: string;
  name: string;
  description: string;
  icon: string;
  awarded_at: string | null;
  tier?: 'bronze' | 'prata' | 'ouro' | 'lendaria';
  goal?: number;
  current?: number;
}

export interface UserStats {
  points: number;
  lessonsCompleted: number;
  quizzesPassed: number;
  perfectScores: number;
  coursesCompleted: number;
  coursesInProgress: number;
  certificates: number;
  friends: number;
  feedbacks: number;
  studySeconds: number;
  currentStreak: number;
  bestStreak: number;
  hasAvatar: boolean;
  questsCompleted: number;
  level: number;
}

export interface Announcement {
  id: number;
  title: string;
  body: string;
  level: 'info' | 'important';
  pinned: number;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
}

export interface EventItem {
  id: number;
  title: string;
  description: string | null;
  location: string | null;
  url: string | null;
  starts_at: string;
  ends_at: string | null;
  course_id: number | null;
  course_title?: string | null;
  course_slug?: string | null;
}
