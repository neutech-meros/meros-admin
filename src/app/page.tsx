import { redirect } from 'next/navigation';

// Overview is not one of the nav's enabled keys, so landing there would drop the user on a screen
// the sidebar can't navigate back to. Users & Creators is the first enabled screen.
export default function Home() {
  redirect('/users');
}
