import { cookies } from "next/headers";
import { Profile, UserRole } from "./types";
import { db } from "./db";

const SESSION_COOKIE_NAME = "sesa_session_user";

export interface SessionUser {
  id: string;
  username: string;
  full_name: string;
  email: string;
  role: UserRole;
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionCookie) return null;

  try {
    const parsed = JSON.parse(decodeURIComponent(sessionCookie)) as SessionUser;
    
    // Check volunteer accounts first
    const volunteer = await db.getVolunteerByUsername(parsed.username);
    if (volunteer && volunteer.is_active) {
      return {
        id: volunteer.id,
        username: volunteer.username,
        full_name: volunteer.full_name,
        email: volunteer.email || `${volunteer.username}@mitaoe.ac.in`,
        role: (volunteer.role === "lead" ? "organizer" : volunteer.role) as UserRole,
      };
    }

    // Verify against profiles
    const profile = await db.getProfileById(parsed.id);
    if (!profile || !profile.is_active) return null;

    return {
      id: profile.id,
      username: profile.username,
      full_name: profile.full_name,
      email: profile.email,
      role: profile.role,
    };
  } catch {
    return null;
  }
}

export async function requireAuth(allowedRoles?: UserRole[]): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHORIZED: Authentication required");
  }

  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(user.role)) {
      throw new Error(`FORBIDDEN: Requires one of [${allowedRoles.join(", ")}] role`);
    }
  }

  return user;
}

export function hasPermission(userRole: UserRole, requiredRole: "admin_only" | "organizer_up" | "volunteer_up"): boolean {
  if (userRole === "super_admin") return true;
  // Per Senior guidance, volunteers have organizer-level capability to create/manage events & memberships
  if (requiredRole === "organizer_up" && (userRole === "organizer" || userRole === "volunteer")) return true;
  if (requiredRole === "volunteer_up" && (userRole === "organizer" || userRole === "volunteer")) return true;
  return false;
}

export function createSessionCookie(user: {
  id: string;
  username: string;
  full_name: string;
  email?: string;
  role: string;
}): string {
  const role = (user.role === "lead" ? "organizer" : user.role) as UserRole;
  const payload: SessionUser = {
    id: user.id,
    username: user.username,
    full_name: user.full_name,
    email: user.email || `${user.username}@mitaoe.ac.in`,
    role,
  };
  return encodeURIComponent(JSON.stringify(payload));
}

export const AUTH_COOKIE_OPTIONS = {
  name: SESSION_COOKIE_NAME,
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 7, // 7 days
};
