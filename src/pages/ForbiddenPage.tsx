import { Link } from 'react-router-dom';

export default function ForbiddenPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-4xl font-bold">403</h1>
      <p className="text-lg text-muted-foreground">You don't have permission to access this page.</p>
      <Link to="/dashboard" className="text-primary underline underline-offset-4">
        Back to Dashboard
      </Link>
    </div>
  );
}
