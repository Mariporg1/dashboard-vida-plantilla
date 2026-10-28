import { passwordHash } from "@/lib/settings";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  return <LoginForm firstTime={!(await passwordHash())} />;
}
