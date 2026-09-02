import GoalDetailPage from '@/components/goals/GoalDetailPage';

export default function Page({ params }: { params: { id: string } }) {
  return <GoalDetailPage goalId={params.id} />;
}
