export const COURSE_OPTIONS = ["DIPLOMA", "BACHELOR", "M_SC", "PHD"] as const;
export const ACTION_OPTIONS = ["IN", "OUT"] as const;

export type CourseType = (typeof COURSE_OPTIONS)[number];
export type ActionType = (typeof ACTION_OPTIONS)[number];

export type StatusType = "PENDING" | "ACTIVE" | "INACTIVE" | "REJECTED";
export type RoleType = "STUDENT" | "LECTURER" | "STAFF" | "ADMIN";

export type ScanDeviceRow = {
  id: string;
  name: string;
  type: ActionType;
  location: string;
  serial_number: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type RfidReaderPortStatus = {
  device_id: string;
  device_name: string;
  device_type: ActionType;
  location: string;
  port: string;
  connected: boolean;
  state: "idle" | "connecting" | "connected" | "reconnecting" | "stopped";
  last_epc: string | null;
  last_error: string | null;
  last_message: string | null;
  last_seen_at: string | null;
};

export type RfidReaderStatus = {
  enabled: boolean;
  last_sync_at: string | null;
  last_sync_error: string | null;
  ports: RfidReaderPortStatus[];
};

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
  device_id: string | null;
  created_at: string;
  users:
    | Pick<UserRow, "name" | "email" | "rfid_number">
    | Pick<UserRow, "name" | "email" | "rfid_number">[]
    | null;
  device: Pick<ScanDeviceRow, "name" | "type" | "location"> | null;
};

export type SessionRow = {
  id: string;
  user_id: string;
  in_time: string;
  out_time: string | null;
  total_time: number | null;
  device_id: string | null;
  users:
    | Pick<UserRow, "name" | "rfid_number" | "email">
    | Pick<UserRow, "name" | "rfid_number" | "email">[]
    | null;
  device: Pick<ScanDeviceRow, "name" | "type" | "location"> | null;
};
