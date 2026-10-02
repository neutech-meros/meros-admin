import { redirect } from 'next/navigation';

import { HOME_PATH } from '@/components/admin/nav-config';

export default function Home() {
  redirect(HOME_PATH);
}
