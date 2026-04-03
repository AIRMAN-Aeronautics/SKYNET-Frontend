import { useParams } from 'react-router-dom';

export default function StudentDetailPage() {
  const { profileId } = useParams<{ profileId: string }>();
  return (
    <div>
      <h1 className="text-2xl font-bold">Student Detail</h1>
      <p className="text-muted-foreground">Profile ID: {profileId}</p>
    </div>
  );
}
