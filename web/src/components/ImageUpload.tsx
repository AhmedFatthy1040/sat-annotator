import React, { useState } from 'react';
import { api } from '../services/api';

interface ImageUploadProps {
  onUploadSuccess: () => void;
}

export const ImageUpload = ({ onUploadSuccess }: ImageUploadProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      setError('Please select a file to upload');
      return;
    }    // Validate file size
    const maxSizeMB = 10;
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File size exceeds ${maxSizeMB}MB limit. Please choose a smaller file.`);
      return;
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/tiff', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError(`Unsupported file type: ${file.type}. Please use JPG, PNG, TIFF, or WebP.`);
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);
      setError(null);
      
      // Simulate progress updates with more realistic timing based on file size
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          // Adjust speed based on file size
          const increment = 25 / (1 + file.size / (1024 * 1024)); // Smaller increment for larger files
          const newProgress = prev + increment;
          return newProgress >= 90 ? 90 : newProgress;
        });
      }, 300);
      
      await api.uploadImage(file);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
        // Reset form and close modal after a brief delay
      setTimeout(() => {
        setFile(null);
        setIsModalOpen(false);
        setUploadProgress(0);
        
        // Reset the input value
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        
        // Notify parent component to refresh the image list
        onUploadSuccess();
      }, 800);
        } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setUploadProgress(0);
      // Don't reset the file input on error so the user can try again with the same file
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
      setError(null);
    }
  };

  return (
    <div>
      <button
        onClick={() => setIsModalOpen(true)}
        className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded flex items-center text-sm font-medium transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        Upload Image
      </button>      {/* Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-md max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-2 border-b">
              <h2 className="text-base font-medium text-gray-700">Upload Image</h2>
              <button 
                onClick={() => !isUploading && setIsModalOpen(false)}
                disabled={isUploading}
                className="text-gray-500 hover:text-gray-700 disabled:opacity-50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="p-4">
                <div
                  className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer
                    ${file ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-blue-500'}`}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >                  <input
                    type="file"
                    id="fileInput"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept="image/*"
                    disabled={isUploading}
                  />
                  <label htmlFor="fileInput" className="cursor-pointer text-center w-full">
                    {file ? (
                      <>
                        <div className="text-green-600 mb-2">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <p className="text-green-600 font-medium">File selected:</p>
                        <p className="text-gray-800 font-medium mt-1">{file.name}</p>
                        <p className="text-gray-500 text-sm mt-1">
                          {(file.size / 1024 / 1024).toFixed(2)} MB - {file.type}
                        </p>                        <button 
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            setFile(null);
                            // Reset the input value so the same file can be selected again
                            if (fileInputRef.current) {
                              fileInputRef.current.value = '';
                            }
                          }}
                          className="mt-3 text-sm text-red-600 hover:text-red-800 underline"
                          disabled={isUploading}
                        >
                          Remove file
                        </button>
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-14 w-14 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-lg text-gray-800 font-medium">Drag & drop image here</p>
                        <p className="text-gray-600 mt-1">or click to browse files</p>
                        <p className="text-gray-500 text-sm mt-3">
                          Supports: JPG, PNG, TIFF, GeoTIFF
                        </p>
                      </>
                    )}
                  </label>
                </div>

                {error && (
                  <div className="mt-3 bg-red-50 text-red-600 p-3 rounded-md text-sm">
                    <div className="font-bold">Error</div>
                    <div>{error}</div>
                  </div>
                )}

                {isUploading && (
                  <div className="mt-4">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <div>Uploading...</div>
                      <div>{Math.round(uploadProgress)}%</div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out" 
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>

              <div className="px-4 py-3 bg-gray-50 flex justify-end rounded-b-lg">
                <button
                  type="button"
                  onClick={() => !isUploading && setIsModalOpen(false)}
                  disabled={isUploading}
                  className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded mr-3 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!file || isUploading}
                  className={`px-4 py-2 rounded text-white font-medium 
                    ${!file || isUploading ? 
                      'bg-gray-400 cursor-not-allowed' : 
                      'bg-blue-600 hover:bg-blue-700'}`}
                >
                  {isUploading ? 'Uploading...' : 'Upload Image'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
