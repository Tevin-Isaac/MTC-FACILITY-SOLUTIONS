import { getAccounts, getSites } from "@/lib/data/queries";
import { NewWorkOrderForm } from "@/components/NewWorkOrderForm";

export default async function NewWorkOrderPage() {
  const [accounts, sites] = await Promise.all([getAccounts(), getSites()]);
  return <NewWorkOrderForm accounts={accounts} sites={sites} />;
}
