import React from 'react';
import { ImageUpload } from './ImageUpload';

interface HomePageProps {
  onStartAnnotating: () => void;
}

const HomePage: React.FC<HomePageProps> = ({ onStartAnnotating }) => {  return (
    <div className="flex flex-col w-full bg-gray-900 text-gray-100">
      {/* Hero Section */}      <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white py-20 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <div className="mb-8 flex justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </div>
          
          <h1 className="text-4xl sm:text-5xl font-bold mb-6 text-white">Satellite Image Annotator</h1>
          
          <p className="text-xl mb-8 max-w-3xl mx-auto text-gray-300">
            A powerful tool for annotating satellite imagery with precision and ease.
            Create annotations, export data, and streamline your geospatial analysis workflow.
          </p>
          
          <div className="flex justify-center space-x-4 flex-wrap">            <button 
              onClick={onStartAnnotating}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-md font-medium text-lg shadow-md transition-all duration-300 mb-2 hover:scale-105 hover:shadow-lg"
            >
              Start Annotating
            </button>
          </div>
        </div>
      </div>{/* Upload Button Section */}
      <div className="bg-gray-800 py-8 px-4 border-t border-gray-700">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-6 text-white">Upload Your Own Image</h2>
          <p className="text-gray-300 mb-6">
            Have satellite imagery you want to annotate? Upload it now to get started.
          </p>
          <div className="flex justify-center">
            <ImageUpload onUploadSuccess={onStartAnnotating} />
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16 px-4 bg-gray-900">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-white">
            Key Features
          </h2>
            <div className="bg-gray-800 p-8 rounded-lg shadow-md border border-gray-700 mb-10 transform transition-all duration-300 hover:scale-[1.01] hover:shadow-lg hover:border-blue-500">
            <h3 className="text-2xl font-semibold mb-6 text-blue-400">AI-Powered Annotation</h3>
            <ul className="space-y-3 text-gray-300">
              <li className="flex items-start">
                <span className="text-blue-400 mr-2">•</span>
                <span>Segment Anything Model (SAM) integration for automatic object detection</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-400 mr-2">•</span>
                <span>One-click AI segmentation of satellite features</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-400 mr-2">•</span>
                <span>Smart boundary detection and refinement</span>
              </li>
            </ul>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-8">
            {/* Feature 1 */}            <div className="bg-gray-800 p-6 rounded-lg shadow-md border border-gray-700 transform transition-all duration-300 hover:scale-[1.03] hover:shadow-lg hover:border-blue-400">
              <div className="h-12 w-12 bg-gray-700 rounded-lg text-blue-400 flex items-center justify-center mb-4 transition-colors duration-300 group-hover:bg-gray-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-white">Versatile Annotation Tools</h3>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">•</span>
                  <span>Polygon, rectangle, and point annotations</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">•</span>
                  <span>Manual and AI-assisted drawing tools</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">•</span>
                  <span>Custom labels and attributes support</span>
                </li>
              </ul>
            </div>
              {/* Feature 2 */}            <div className="bg-gray-800 p-6 rounded-lg shadow-md border border-gray-700 transform transition-all duration-300 hover:scale-[1.03] hover:shadow-lg hover:border-blue-400">
              <div className="h-12 w-12 bg-gray-700 rounded-lg text-blue-400 flex items-center justify-center mb-4 transition-colors duration-300 group-hover:bg-gray-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-white">Image Support</h3>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">•</span>
                  <span>Support for JPG, PNG, TIFF, and GeoTIFF formats</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">•</span>
                  <span>High-resolution satellite imagery handling</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">•</span>
                  <span>Image gallery with preview thumbnails</span>
                </li>
              </ul>
            </div>
            
            {/* Feature 3 */}            <div className="bg-gray-800 p-6 rounded-lg shadow-md border border-gray-700 transform transition-all duration-300 hover:scale-[1.03] hover:shadow-lg hover:border-blue-400">
              <div className="h-12 w-12 bg-gray-700 rounded-lg text-blue-400 flex items-center justify-center mb-4 transition-colors duration-300 group-hover:bg-gray-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-white">Data Export</h3>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">•</span>
                  <span>JSON export for machine learning pipelines</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">•</span>
                  <span>Annotation statistics and metrics</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">•</span>
                  <span>Compatible with GIS and ML frameworks</span>
                </li>
              </ul>
            </div>
            
            {/* Feature 4 */}            <div className="bg-gray-800 p-6 rounded-lg shadow-md border border-gray-700 transform transition-all duration-300 hover:scale-[1.03] hover:shadow-lg hover:border-blue-400">
              <div className="h-12 w-12 bg-gray-700 rounded-lg text-blue-400 flex items-center justify-center mb-4 transition-colors duration-300 group-hover:bg-gray-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-white">User Experience</h3>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">•</span>
                  <span>Interactive and responsive interface</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">•</span>
                  <span>Session-based workflow</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">•</span>
                  <span>Drag and drop image upload</span>
                </li>
              </ul>
            </div>          </div>
        </div>
      </div>
      
      {/* Call to action section */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 py-16 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6 text-white">Ready to Start Annotating?</h2>
          <p className="text-xl mb-8 text-gray-300 max-w-3xl mx-auto">
            Begin creating precise annotations for your satellite imagery with our powerful tools.
          </p>          <button
            onClick={onStartAnnotating}
            className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-4 rounded-md text-lg font-semibold shadow-lg transition-all duration-300 hover:scale-110 hover:shadow-xl"
          >
            Get Started Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
