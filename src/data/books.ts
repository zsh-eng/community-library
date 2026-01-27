export type LocationCode = "ELM" | "CENDANA" | "SAGA";

export type Book = {
  id: string;
  qrCode: string;
  title: string;
  author: string;
  isbn: string;
  coverUrl: string;
  description: string;
  available: boolean;
  location: string;
  locationQrCode: LocationCode;
  category: string;
};

const bookList: Book[] = [
  {
    id: "1",
    qrCode: "BOOK-001",
    title: "The Great Gatsby",
    author: "F. Scott Fitzgerald",
    isbn: "978-0-7432-7356-5",
    coverUrl: "https://placehold.co/200x300/1a1a2e/e0e0e0?text=Great+Gatsby",
    description:
      "A story of the mysteriously wealthy Jay Gatsby and his love for Daisy Buchanan, set in the Jazz Age on Long Island.",
    available: true,
    location: "ELM - Shelf A-12",
    locationQrCode: "ELM",
    category: "Classic Fiction",
  },
  {
    id: "2",
    qrCode: "BOOK-002",
    title: "To Kill a Mockingbird",
    author: "Harper Lee",
    isbn: "978-0-06-112008-4",
    coverUrl: "https://placehold.co/200x300/16213e/e0e0e0?text=Mockingbird",
    description:
      "A novel about racial injustice in the Deep South, seen through the eyes of young Scout Finch as her father defends a wrongly accused man.",
    available: true,
    location: "CENDANA - Shelf B-04",
    locationQrCode: "CENDANA",
    category: "Classic Fiction",
  },
  {
    id: "3",
    qrCode: "BOOK-003",
    title: "1984",
    author: "George Orwell",
    isbn: "978-0-452-28423-4",
    coverUrl: "https://placehold.co/200x300/0f3460/e0e0e0?text=1984",
    description:
      "A dystopian novel set in a totalitarian society ruled by Big Brother, exploring themes of surveillance, truth, and individuality.",
    available: false,
    location: "SAGA - Shelf C-08",
    locationQrCode: "SAGA",
    category: "Dystopian Fiction",
  },
  {
    id: "4",
    qrCode: "BOOK-004",
    title: "Pride and Prejudice",
    author: "Jane Austen",
    isbn: "978-0-14-143951-8",
    coverUrl: "https://placehold.co/200x300/533483/e0e0e0?text=Pride",
    description:
      "A witty romantic novel following Elizabeth Bennet as she navigates issues of manners, morality, and marriage in Regency-era England.",
    available: true,
    location: "ELM - Shelf A-03",
    locationQrCode: "ELM",
    category: "Romance",
  },
  {
    id: "5",
    qrCode: "BOOK-005",
    title: "The Catcher in the Rye",
    author: "J.D. Salinger",
    isbn: "978-0-316-76948-0",
    coverUrl: "https://placehold.co/200x300/e94560/e0e0e0?text=Catcher",
    description:
      "The story of Holden Caulfield's experiences in New York City after being expelled from prep school, capturing teenage alienation and angst.",
    available: true,
    location: "CENDANA - Shelf B-11",
    locationQrCode: "CENDANA",
    category: "Coming-of-Age",
  },
];

export const books: Map<string, Book> = new Map(
  bookList.map((book) => [book.qrCode, book]),
);

export function lookupBook(qrCode: string): Book | undefined {
  return books.get(qrCode.trim());
}
