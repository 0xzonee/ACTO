import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Navigation, Footer, Logo } from './components';
import { Home, About } from './pages';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-white text-gray-900">
        <Logo />
        <Navigation />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;
