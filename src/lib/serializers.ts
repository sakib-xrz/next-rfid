import type {
  ActionType,
  CourseType,
  GateEventStatusType,
  LogRow,
  RoleType,
  ScanDeviceRow,
  SessionRow,
  StatusType,
  UserRow,
} from "@/lib/types";

type UserLike = {
  id: string;
  idFromInstitution: string;
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

type ScanDeviceLike = {
  id: string;
  name: string;
  type: string;
  location: string;
  serialNumber: string | null;
  gateRelayPort: string | null;
  stationId: string | null;
  gateEnabled: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type RelatedDeviceLike = {
  name: string;
  type: string;
  location: string;
} | null;

export function serializeUser(user: UserLike): UserRow {
  return {
    id: user.id,
    institution_id: user.idFromInstitution,
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

export function serializeScanDevice(device: ScanDeviceLike): ScanDeviceRow {
  return {
    id: device.id,
    name: device.name,
    type: device.type as ActionType,
    location: device.location,
    serial_number: device.serialNumber,
    gate_relay_port: device.gateRelayPort,
    station_id: device.stationId,
    gate_enabled: device.gateEnabled,
    is_active: device.isActive,
    created_at: device.createdAt.toISOString(),
    updated_at: device.updatedAt.toISOString(),
  };
}

function serializeRelatedDevice(device: RelatedDeviceLike) {
  if (!device) return null;

  return {
    name: device.name,
    type: device.type as ActionType,
    location: device.location,
  };
}

export function serializeLog(log: {
  id: string;
  userId: string;
  action: string;
  deviceId: string | null;
  createdAt: Date;
  user: RelatedUserLike | null;
  device: RelatedDeviceLike;
}): LogRow {
  return {
    id: log.id,
    user_id: log.userId,
    action: log.action as ActionType,
    device_id: log.deviceId,
    created_at: log.createdAt.toISOString(),
    users: serializeRelatedUser(log.user),
    device: serializeRelatedDevice(log.device),
  };
}

export function serializeGateEvent(event: {
  id: string;
  deviceId: string;
  userId: string | null;
  action: string;
  status: string;
  reason: string | null;
  error: string | null;
  createdAt: Date;
  device: RelatedDeviceLike;
  user: RelatedUserLike | null;
}) {
  return {
    id: event.id,
    device_id: event.deviceId,
    user_id: event.userId,
    action: event.action as ActionType,
    status: event.status as GateEventStatusType,
    reason: event.reason,
    error: event.error,
    created_at: event.createdAt.toISOString(),
    device: serializeRelatedDevice(event.device),
    user: serializeRelatedUser(event.user),
  };
}

export function serializeSession(session: {
  id: string;
  userId: string;
  inTime: Date;
  outTime: Date | null;
  totalTime: number | null;
  deviceId: string | null;
  user: RelatedUserLike | null;
  device: RelatedDeviceLike;
}): SessionRow {
  return {
    id: session.id,
    user_id: session.userId,
    in_time: session.inTime.toISOString(),
    out_time: session.outTime?.toISOString() ?? null,
    total_time: session.totalTime,
    device_id: session.deviceId,
    users: serializeRelatedUser(session.user),
    device: serializeRelatedDevice(session.device),
  };
}
