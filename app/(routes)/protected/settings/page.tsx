import { Metadata } from "next";
import { UserSettings } from "@/components/settings/user-settings";

export const metadata: Metadata = {
  title: "Settings | Joi",
  description: "Manage your account settings and preferences",
};

export default function SettingsPage() {
  return (
    <div className="container mx-auto max-w-5xl py-6 space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences.
        </p>
      </div>
      <UserSettings />
    </div>
  );
} 