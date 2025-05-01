import { useState, useEffect, useRef } from 'react';
import './App.css';
import { ImageGallery } from './components/ImageGallery';
import { ImageViewer } from './components/ImageViewer';
import HomePage from './components/HomePage';

const App = () => {
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [showHomepage, setShowHomepage] = useState<boolean>(true);
  const [headerVisible, setHeaderVisible] = useState(true);
  const [headerOpacity, setHeaderOpacity] = useState(1);
  const lastScrollY = useRef(0);

  // ✅ Updated scroll listener
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;      if (currentScrollY < lastScrollY.current) {
        // Scrolling UP → show header
        setHeaderVisible(true);
      } else if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
        // Scrolling DOWN and past threshold → hide header
        setHeaderVisible(false);
      }

      lastScrollY.current = currentScrollY;

      // Fade effect
      const newOpacity = Math.max(1 - currentScrollY / 150, 0.75);
      setHeaderOpacity(newOpacity);
    };

    // Initial check
    handleScroll();

    window.addEventListener('scroll', handleScroll);

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="flex flex-col min-h-screen w-screen bg-gray-100 overflow-y-auto">
      <header
        className={`bg-gray-800 text-white p-2 w-full transition-all duration-200 ${
          headerVisible ? 'transform-none' : '-translate-y-full'
        } border-b-2 border-gray-600`}
        style={{
          opacity: headerOpacity,
          backdropFilter: headerOpacity < 1 ? 'blur(5px)' : 'none',
          boxShadow: headerOpacity < 1 ? '0 2px 10px rgba(0,0,0,0.2)' : 'none',
        }}
      >
        <div className="w-full flex justify-between items-center px-4">
          <h1
            onClick={() => setShowHomepage(true)}
            className="text-xl font-bold cursor-pointer hover:text-blue-300 transition-colors"
          >
            Satellite Image Annotator
          </h1>
          <div className="flex items-center space-x-3">
            <div className="text-sm">AI-powered annotation with SAM</div>
            <div className="text-xs bg-blue-500 py-1 px-2 rounded hover:bg-blue-600 transition-colors">
              EgSA
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1 w-full overflow-visible">
        <div className="flex flex-col">
          {/* Main Content Area */}
          <div className="flex-1 overflow-visible">
            {selectedImageId ? (
              <div className="flex flex-col w-full">
                <div className="bg-gray-800 px-4 py-1 flex items-center">
                  <div className="w-full">
                    <button
                      onClick={() => {
                        setSelectedImageId(null);
                        setShowHomepage(false);
                      }}
                      className="bg-blue-500 hover:bg-blue-600 text-white py-1 px-3 rounded flex items-center"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 mr-1"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Back to Gallery
                    </button>
                  </div>
                </div>
                <div className="flex-1 bg-white w-full overflow-auto">
                  <ImageViewer imageId={selectedImageId} />
                </div>
              </div>
            ) : showHomepage ? (
              <div className="overflow-visible">
                <HomePage onStartAnnotating={() => setShowHomepage(false)} />
              </div>
            ) : (
              <div className="flex flex-col p-4 w-full items-center">
                <div className="bg-white p-6 rounded-lg shadow-lg text-gray-800 max-w-4xl w-full">
                  <h2 className="text-xl font-bold mb-4 text-gray-900 flex items-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6 mr-2 text-blue-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    Image Gallery
                  </h2>
                  <p className="mb-4 text-gray-600">
                    Select an image to begin annotation. You can use AI-assisted segmentation or manual drawing
                    tools.
                  </p>
                  <ImageGallery onSelectImage={setSelectedImageId} />
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      <footer className="bg-gray-800 text-gray-400 py-4 text-center text-sm w-full mt-auto">
        <div className="w-full">
          <p>
            © {new Date().getFullYear()} Satellite Image Annotation Tool - Powered by Segment Anything Model
          </p>
          <p className="text-xs mt-1">
            Sponsored by Egyptian Space Agency (EgSA) |{' '}
            <a
              href="https://github.com/AhmedFatthy1040/sat-annotator"
              className="text-blue-300 hover:text-blue-200"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open Source Project
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
