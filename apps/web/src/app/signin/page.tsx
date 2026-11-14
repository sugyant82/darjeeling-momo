import { Suspense } from 'react';
import { SignIn } from '@/components/sign-in';

export const metadata = { title: 'Sign in' };

export default function SignInPage() {
  return (
    <div className="container">
      <Suspense fallback={null}>
        <SignIn />
      </Suspense>
    </div>
  );
}
