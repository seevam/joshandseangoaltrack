import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F0F0F0]">
      <SignUp />
    </div>
  );
}
