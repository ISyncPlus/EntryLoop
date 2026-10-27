export function Feedback({
  error = '',
  notice = '',
}: {
  error?: string;
  notice?: string;
}) {
  return (
    <>
      {error && (
        <p role="alert" className="feedback feedback-error">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="feedback feedback-success">
          {notice}
        </p>
      )}
    </>
  );
}
