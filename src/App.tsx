import { BrowserRouter, Route, Routes } from "react-router";
import Book from "./Book";
import Library from "./Library";

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
