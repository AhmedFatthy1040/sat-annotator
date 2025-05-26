import { useState } from 'react';
import { api } from '../services/api';

interface ImageUploadProps {
  onUploadSuccess: () => void;
}

export const ImageUpload = ({ onUploadSuccess }: ImageUploadProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
        // Check for valid image file types including specialized formats
      const validTypes = [
        'image/jpeg', 'image/png', 'image/tiff', 'image/tif', 'image/geotiff',
        'image/webp', 'image/heic', 'image/heif', 'image/jp2', 'image/j2k',
        'application/octet-stream'  // For various formats that might be sent as binary
      ];
      const validExtensions = [
        '.jpg', '.jpeg', '.png', '.tif', '.tiff', 
        '.webp', '.heic', '.heif', '.jp2', '.j2k',
        '.cr2', '.nef', '.arw', '.dng',  // RAW formats
        '.dcm',  // DICOM
        '.fits', '.fit',  // FITS astronomy
        '.nc',  // NetCDF
        '.h5', '.hdf'  // HDF5
      ];
      const fileName = droppedFile.name.toLowerCase();
      
      const isValidType = validTypes.includes(droppedFile.type) || 
                         validExtensions.some(ext => fileName.endsWith(ext));
      
      if (isValidType) {
        setFile(droppedFile);
        setError(null);
      } else {
        setError('Please drop a valid image file (JPEG, PNG, TIFF, WebP, HEIC, RAW, DICOM, FITS, NetCDF, HDF5)');
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      setError('Please select a file to upload');
      return;
    }

    try {
      setIsUploading(true);
      setError(null);
      
      await api.uploadImage(file);
      
      // Reset form and close modal
      setFile(null);
      setIsModalOpen(false);
      
      // Notify parent component to refresh the image list
      onUploadSuccess();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div>
      <button
        onClick={() => setIsModalOpen(true)}
        className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center gap-2"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
        </svg>
        Upload Image
      </button>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Upload New Image</h2>
                    <p className="text-blue-100 text-sm">Add satellite imagery for annotation</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  disabled={isUploading}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6">
              {/* Drag and Drop Area */}
              <div 
                className={`mb-6 border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
                  dragOver 
                    ? 'border-blue-500 bg-blue-50' 
                    : file 
                      ? 'border-green-500 bg-green-50' 
                      : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                {file ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-center">
                      <div className="p-3 bg-green-100 rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                    <div>
                      <p className="font-semibold text-green-700">{file.name}</p>
                      <p className="text-sm text-gray-600">{formatFileSize(file.size)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFile(null)}
                      className="text-sm text-red-600 hover:text-red-700 font-medium"
                    >
                      Remove file
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center">
                      <div className="p-4 bg-gray-100 rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </div>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-gray-700">
                        Drag and drop your image here
                      </p>
                      <p className="text-gray-500">or click to browse files</p>
                    </div>
                  </div>
                )}
                
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept="image/jpeg,image/png,image/tiff,image/tif,image/geotiff,image/webp,image/heic,image/heif,image/jp2,.tif,.tiff,.jpg,.jpeg,.png,.webp,.heic,.heif,.jp2,.j2k,.cr2,.nef,.arw,.dng,.dcm,.fits,.fit,.nc,.h5,.hdf"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={isUploading}
                />
              </div>

              {/* File Info */}
              <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>                    <h4 className="font-semibold text-blue-800 mb-1">Supported Formats</h4>
                    <p className="text-sm text-blue-700">
                      Standard: JPEG, PNG, TIFF, WebP, HEIC/HEIF, JPEG2000
                    </p>
                    <p className="text-sm text-blue-700">
                      Scientific: NetCDF (.nc), HDF5 (.h5), FITS (.fits)
                    </p>
                    <p className="text-sm text-blue-700">
                      Camera RAW: CR2, NEF, ARW, DNG | Medical: DICOM (.dcm)
                    </p>
                    <p className="text-sm text-blue-600 mt-1">
                      Specialized formats will be automatically processed for annotation
                    </p>
                    <p className="text-sm text-blue-600">
                      Maximum file size: 100MB
                    </p>
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-1 bg-red-100 rounded-full">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-red-700 font-medium">{error}</p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-4 rounded-xl transition-colors"
                  disabled={isUploading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-4 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:transform-none disabled:hover:shadow-lg flex items-center justify-center gap-2"
                  disabled={isUploading || !file}
                >
                  {isUploading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      Upload Image
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
