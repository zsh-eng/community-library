import Book from "@/Book";
import { extractIdFromSlug } from "@/lib/utils";
import { Navigate, useParams } from "react-router";

function BookWrapper() {
  const { slug } = useParams<{ slug: string }>();

  if (!slug) {
    return <Navigate to="/" replace />;
  }

  const id = extractIdFromSlug(slug);

  if (!id) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-lg text-red-600">Invalid book URL</p>
      </div>
    );
  }

  return <Book id={id} />;
}

export default BookWrapper;
