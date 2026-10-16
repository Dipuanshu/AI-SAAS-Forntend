import { Redirect } from 'expo-router';
import { useAuth } from '../lib/auth';

export default function Index() {
  const { status, role } = useAuth();
  if (status !== 'in') return <Redirect href="/welcome" />;
  return <Redirect href={role === 'super_admin' ? '/dashboard' : '/home'} />;
}
