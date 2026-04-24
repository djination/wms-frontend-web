import { redirect } from 'next/navigation';

/** URL lama; menu sekarang di bawah Inventory → Inventory Balance */
export default function LegacyMasterDataInventoryPage() {
  redirect('/inventory/balance');
}
