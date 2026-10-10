import type { LucideIcon } from "lucide-react";
import {
  Activity,
  UserPlus,
  Award,
  BarChart3,
  BookOpen,
  Briefcase,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  LineChart,
  MessageSquareText,
  MessagesSquare,
  Settings,
  Target,
  TrendingUp,
  Users,
  UsersRound,
} from "lucide-react";
import type { AppRole } from "@/features/auth/roles";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}
export interface NavSection {
  label: string;
  items: NavItem[];
}

/** Role-specific navigation. Each role only ever receives its own menu. */
export const NAVIGATION: Record<AppRole, NavSection[]> = {
  admin: [
    {
      label: "Overview",
      items: [{ to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard }],
    },
    {
      label: "Candidates",
      items: [
        { to: "/admin/candidates", label: "All Candidates", icon: Users },
        { to: "/admin/candidates/add", label: "Add Candidate", icon: UserPlus },
        { to: "/admin/activity", label: "Candidate Activity", icon: Activity },
        { to: "/admin/assignments", label: "Teams & Assignments", icon: UsersRound },
      ],
    },
    {
      label: "Academy",
      items: [
        { to: "/admin/modules", label: "Academy", icon: GraduationCap },
        { to: "/admin/assessments", label: "Assessments", icon: ClipboardList },
        { to: "/admin/progress", label: "Progress", icon: TrendingUp },
        { to: "/admin/certificates", label: "Certifications", icon: Award },
      ],
    },
    {
      label: "Recruitment",
      items: [
        { to: "/admin/recruitment/dashboard", label: "Recruitment Operations", icon: Briefcase },
      ],
    },
    {
      label: "Administration",
      items: [
        { to: "/admin/reports", label: "Reports", icon: BarChart3 },
        { to: "/admin/settings", label: "Settings", icon: Settings },
      ],
    },
  ],
  trainer: [
    {
      label: "Training",
      items: [
        { to: "/trainer/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { to: "/trainer/trainees", label: "Trainees", icon: UsersRound },
        { to: "/trainer/progress", label: "Progress", icon: TrendingUp },
        { to: "/trainer/coaching", label: "Coaching", icon: MessagesSquare },
        { to: "/trainer/feedback", label: "Feedback", icon: MessageSquareText },
      ],
    },
  ],
  manager: [
    {
      label: "Management",
      items: [
        { to: "/manager/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { to: "/manager/team", label: "Team", icon: UsersRound },
        { to: "/manager/reports", label: "Reports", icon: BarChart3 },
        { to: "/manager/analytics", label: "Analytics", icon: LineChart },
        { to: "/manager/performance", label: "Performance", icon: Target },
        { to: "/manager/recruitment/dashboard", label: "Recruitment Operations", icon: Briefcase },
      ],
    },
  ],
  candidate: [
    {
      label: "Recruiter Academy",
      items: [
        { to: "/recruiter/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { to: "/recruiter/modules", label: "Academy", icon: BookOpen },
        { to: "/recruiter/assessments", label: "Assessments", icon: ClipboardList },
        { to: "/recruiter/final-assessment", label: "Final Assessment", icon: Target },
        { to: "/recruiter/progress", label: "Progress", icon: TrendingUp },
        { to: "/recruiter/certificate", label: "Certificate", icon: Award },
        { to: "/recruiter/operations/dashboard", label: "Recruitment Operations", icon: Briefcase },
      ],
    },
  ],
};
