import { Metadata } from "next";
import { RegistrationForm } from "@/components/auth/registration-form";

export const metadata: Metadata = {
  title: "Register | Joi Support",
  description: "Complete your registration to get started with Joi Support",
};

export default function RegisterPage() {
  return (
    <div className="flex flex-col items-center justify-center w-full max-w-md mx-auto space-y-6">
      <div className="flex flex-col space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Complete Registration
        </h1>
        <p className="text-sm text-muted-foreground">
          Choose your role to get started
        </p>
      </div>
      <RegistrationForm />
    </div>
  );
} 