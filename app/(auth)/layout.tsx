export default function AuthLayout({ children }: { children: React.ReactNode }) {
  // Full-bleed layout — each auth page (Signup, Login) owns its own
  // background, padding, and safe-area handling per the flat design mockups.
  return <main className="min-h-dvh mx-auto w-full max-w-md">{children}</main>;
}
