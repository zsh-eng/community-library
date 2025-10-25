import { BrowserRouter, Route, Routes } from "react-router";
import Book from "./Book";
import Library from "./Library";
import { DataCacheProvider } from "./contexts/DataCacheContext";

function App() {
  return (
    <DataCacheProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Library />} />
          <Route path="/book/:id" element={<Book />} />
        </Routes>
      </BrowserRouter>
    </DataCacheProvider>
  );
}

export default App;
