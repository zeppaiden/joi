import { z } from "zod";

const US_TIMEZONE_VALUES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
] as const;

export const userSettingsSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phoneNumber: z
    .string()
    .regex(/^\d{10}$/, "Please enter a valid 10-digit US phone number")
    .optional()
    .or(z.literal("")),
  timezone: z
    .enum(US_TIMEZONE_VALUES, {
      errorMap: () => ({ message: "Please select a valid US timezone" })
    })
    .default("America/New_York"),
}); 