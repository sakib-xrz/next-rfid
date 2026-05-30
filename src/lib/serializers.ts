import type { ActionType, CourseType, LogRow, RoleType, SessionRow, StatusType, UserRow } from "@/lib/types";

type UserLike = {
  id: string;
  name: string;
  email: string;
  phone: string;
  carNumber: string;
  course: string | null;
  role: string;
  licenseFrontUrl: string;
  licenseBackUrl: string;
  rfidNumber: string | null;
  status: string;
  createdAt: Date;
};

type RelatedUserLike = {
  name: string;
  email: string;
  rfidNumber: string | null;
};

export function serializeUser(user: UserLike): UserRow {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    car_number: user.carNumber,
    course: user.course as CourseType | null,
    role: user.role as RoleType,
    license_front_url: user.licenseFrontUrl,
    license_back_url: user.licenseBackUrl,
    rfid_number: user.rfidNumber,
    status: user.status as StatusType,
    created_at: user.createdAt.toISOString(),
  };
}

export function serializeRelatedUser(user: RelatedUserLike | null) {
  if (!user) return null;

  return {
    name: user.name,
    email: user.email,
    rfid_number: user.rfidNumber,
  };
}

export function serializeLog(log: {
  id: string;
  userId: string;
  action: string;
  createdAt: Date;
  user: RelatedUserLike | null;
}): LogRow {
  return {
    id: log.id,
    user_id: log.userId,
    action: log.action as ActionType,
    created_at: log.createdAt.toISOString(),
    users: serializeRelatedUser(log.user),
  };
}

export function serializeSession(session: {
  id: string;
  userId: string;
  inTime: Date;
  outTime: Date | null;
  totalTime: number | null;
  user: RelatedUserLike | null;
}): SessionRow {
  return {
    id: session.id,
    user_id: session.userId,
    in_time: session.inTime.toISOString(),
    out_time: session.outTime?.toISOString() ?? null,
    total_time: session.totalTime,
    users: serializeRelatedUser(session.user),
  };
}
