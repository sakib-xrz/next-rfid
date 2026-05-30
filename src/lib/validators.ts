import { z } from "zod";

import { ACTION_OPTIONS, COURSE_OPTIONS } from "@/lib/types";

export const registerSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(6, "Phone is required"),
  car_number: z.string().min(2, "Car number is required"),
  course: z.enum(COURSE_OPTIONS),
  license_front_url: z.string().min(1, "Front license upload is required"),
  license_back_url: z.string().min(1, "Back license upload is required"),
});

export const scanSchema = z.object({
  rfid_number: z.string().trim().min(1).max(24),
  device_id: z.string().uuid(),
});

export const createDeviceSchema = z.object({
  name: z.string().min(2, "Device name is required"),
  type: z.enum(ACTION_OPTIONS),
  location: z.string().min(1, "Location is required"),
  serial_number: z.string().trim().optional(),
});
