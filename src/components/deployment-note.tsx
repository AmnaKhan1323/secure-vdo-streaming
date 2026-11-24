import { SITE } from "@/lib/site";
import { Notice } from "./ui";

export function DeploymentNote() {
  return (
    <Notice>
      <p className="font-medium text-violet-200">{SITE.name} · deployment is configured separately</p>
      <p className="mt-1.5">
        Keep localhost for development. In production, set the server authentication URL to the exact HTTPS origin
        that serves this app and approve its hostname at both video providers. {SITE.productionDomains.join(" and ")}
        {" "}are distinct hostnames; neither is automatically allowed by this prototype.
      </p>
      <p className="mt-1.5 text-[10px] text-muted">
        This standalone prototype does not reuse existing website accounts or paid-course enrollments.
        Connect the real website identity and entitlement system before deploying. No integration endpoints are assumed.
      </p>
    </Notice>
  );
}