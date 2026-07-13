import { createProcessFromTemplate } from "./process.service";

export async function createOnboardingProcess(input: {
  actorUserId: string | null;
  employeeId: string;
  templateId?: string | null;
  templateVersion?: number | null;
  plannedDate: string;
  position?: string | null;
  roleName?: string | null;
}) {
  return createProcessFromTemplate({ ...input, processType: "onboarding" });
}
