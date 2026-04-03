import { useParams } from 'react-router-dom';

export default function InstructorDetailPage() {
  const { instructorId } = useParams<{ instructorId: string }>();
  return (
    <div>
      <h1 className="text-2xl font-bold">Instructor Detail</h1>
      <p className="text-muted-foreground">Instructor ID: {instructorId}</p>
    </div>
  );
}
