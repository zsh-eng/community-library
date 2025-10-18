import { BrowserRouter, Routes, Route } from "react-router-dom";
import Library from "./Library";
import Book from "./Book";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Library />} />
        <Route path="/book/:id" element={<Book />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
