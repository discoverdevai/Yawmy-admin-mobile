import { Redirect } from 'expo-router';

// Default entry → Sign In.
// The sign-up flow is only reached via the super-admin's invitation deep link
// (nurseryadmin://invitation), which opens the /invitation screen directly.
export default function Index() {
  return <Redirect href="/sign-in" />;
}
