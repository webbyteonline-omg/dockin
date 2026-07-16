import { redirect } from "next/navigation";

// Superseded by app/onboarding/page.tsx (moved out of the (app) tab-bar
// group so onboarding doesn't render the bottom nav mid-setup). Kept as a
// redirect rather than deleted — sandbox file permissions blocked removing
// this route-group file outright.
export default function OnboardingPageRedirect() {
  redirect("/onboarding");
}
