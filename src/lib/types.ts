export const COURSE_OPTIONS = ["DIPLOMA", "BACHELOR", "M_SC", "PHD"] as const;
export const ACTION_OPTIONS = ["IN", "OUT"] as const;

export type CourseType = (typeof COURSE_OPTIONS)[number];
export type ActionType = (typeof ACTION_OPTIONS)[number];

export type StatusType = "PENDING" | "ACTIVE" | "INACTIVE" | "REJECTED";
export type RoleType = "STUDENT" | "LECTURER" | "STAFF" | "ADMIN";

export type UserRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  car_number: string;
  course: CourseType | null;
  role: RoleType;
  license_front_url: string;
  license_back_url: string;
  rfid_number: string | null;
  status: StatusType;
  created_at: string;
};

export type LogRow = {
  id: string;
  user_id: string;
  action: ActionType;
  created_at: string;
  users:
    | Pick<UserRow, "name" | "email" | "rfid_number">
    | Pick<UserRow, "name" | "email" | "rfid_number">[]
    | null;
};

export type SessionRow = {
  id: string;
  user_id: string;
  in_time: string;
  out_time: string | null;
  total_time: number | null;
  users:
    | Pick<UserRow, "name" | "rfid_number" | "email">
    | Pick<UserRow, "name" | "rfid_number" | "email">[]
    | null;
};
