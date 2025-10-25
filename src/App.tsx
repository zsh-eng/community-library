import { BrowserRouter, Route, Routes } from "react-router";
import Book from "./Book";
import Library from "./Library";
import { ThemeProvider } from "./components/theme-provider";
import { DataCacheProvider } from "./contexts/DataCacheContext";

function App() {
  return (
    <ThemeProvider defaultTheme="system">
      <DataCacheProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Library />} />
            <Route path="/book/:id" element={<Book />} />
          </Routes>
        </BrowserRouter>
      </DataCacheProvider>
    </ThemeProvider>
  );
}

export default App;
