import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Navigation, Footer, Logo, LoadingScreen } from './components';
import { Home, About, Privacy, Terms } from './pages';

function App() {
  return (
    <BrowserRouter>
      <LoadingScreen imagesToPreload={['/hero.png', '/hero2.png', '/hero3.png', '/hero4.png', '/bg1.png', '/bg2.png', '/bg3.png', '/bg4.png']} />
      <div className="min-h-screen bg-white text-gray-900">
        <Logo />
        <Navigation />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;
