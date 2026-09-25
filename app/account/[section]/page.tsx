import AccountScreen from "@/app/components/account-screen";
import { notFound } from "next/navigation";
export default async function AccountSection({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const tabs: Record<string, string> = {
    profile: "profileTab",
    privacy: "privacy",
    manage: "manageTab",
  };
  if (!tabs[section]) notFound();
  return <AccountScreen section={tabs[section]} />;
}
