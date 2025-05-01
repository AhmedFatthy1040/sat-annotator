import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { Image } from '../services/api';
import { ImageUpload } from './ImageUpload';

interface ImageGalleryProps {
  onSelectImage: (imageId: string) => void;
}

export const ImageGallery: React.FC<ImageGalleryProps> = ({ onSelectImage }) => {
  const [images, setImages] = useState<Image[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);

  const fetchImages = async () => {
    try {
      setLoading(true);
      const imageData = await api.getImages();
      setImages(imageData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, []);

  const handleDeleteClick = (e: React.MouseEvent, imageId: string) => {
    e.stopPropagation(); // Prevent image selection when clicking delete
    setDeletingImageId(imageId);
    setShowDeleteModal(true);
  };

  const confirmDeleteImage = async () => {
    if (!deletingImageId) return;
    
    try {
      setLoading(true);
      await api.deleteImage(deletingImageId);
      setImages(images.filter(img => img.image_id !== deletingImageId));
      setShowDeleteModal(false);
      setDeletingImageId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  if (loading && images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <div className="text-center">
          <div className="inline-block animate-spin h-6 w-6 border-2 border-gray-300 border-t-blue-500 rounded-full mb-2"></div>
          <p className="text-gray-500 text-sm">Loading images...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded p-4 text-center">
        <div className="text-red-500 mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-sm text-gray-600 mb-2">Failed to load images: {error}</p>
        <button 
          onClick={fetchImages}
          className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1 text-sm rounded"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with controls */}
      <div className="mb-3 flex justify-between items-center">
        <div>
          <div className="text-base font-medium text-gray-700">{images.length} Images</div>
        </div>
        <div className="flex items-center space-x-2">
          <div className="bg-gray-100 rounded p-0.5 flex">
            <button
              onClick={() => setView('grid')}
              className={`p-1 rounded ${view === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
              title="Grid view"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setView('list')}
              className={`p-1 rounded ${view === 'list' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
              title="List view"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
          </div>
          <ImageUpload onUploadSuccess={fetchImages} />
        </div>
      </div>
      
      {/* Main content area with overflow */}
      <div className="overflow-auto flex-1">
        {view === 'grid' && images.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((image) => {
              const filename = image.file_path.split('/').pop() || '';
              const imageUrl = `/${image.file_path}`;
              
              return (
                <div 
                  key={image.image_id} 
                  className="border rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition-all hover:border-blue-500 relative"
                  onClick={() => onSelectImage(image.image_id)}
                >
                  <div className="h-40 bg-gray-100 flex items-center justify-center overflow-hidden">
                    <img 
                      src={imageUrl}
                      alt={image.file_name || filename}
                      className="object-cover w-full h-full transition-transform hover:scale-105"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x200?text=Image+Not+Available';
                      }}
                    />
                    <button 
                      onClick={(e) => handleDeleteClick(e, image.image_id)}
                      className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow-md opacity-70 hover:opacity-100"
                      title="Delete image"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                  <div className="p-3 bg-white border-t">
                    <h3 className="font-semibold truncate">{image.file_name || filename}</h3>
                    <div className="flex justify-between items-center mt-1">
                      <p className="text-xs text-gray-500 truncate">{image.image_id.substring(0, 10)}...</p>
                      <p className="text-xs text-gray-500">{image.resolution || 'Unknown'}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {view === 'list' && images.length > 0 && (
          <div className="overflow-hidden border rounded divide-y bg-white">
            {images.map((image) => {
              const filename = image.file_path.split('/').pop() || '';
              const imageUrl = `/${image.file_path}`;
              
              return (
                <div key={image.image_id} className="flex items-center p-2 border-b hover:bg-blue-50 cursor-pointer relative"
                  onClick={() => onSelectImage(image.image_id)}
                >
                  <div className="w-12 h-12 bg-gray-100 flex-shrink-0 mr-3">
                    <img 
                      src={imageUrl}
                      alt={image.file_name || filename}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/80?text=NA';
                      }}
                    />
                  </div>
                  <div className="flex-grow min-w-0">
                    <div className="font-medium truncate">{image.file_name || filename}</div>
                    <div className="flex text-xs text-gray-500">
                      <span className="truncate">ID: {image.image_id.substring(0, 8)}...</span>
                      <span className="mx-1">•</span>
                      <span>{image.resolution || 'Unknown resolution'}</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDeleteClick(e, image.image_id)}
                    className="ml-2 p-1 text-red-500 hover:bg-red-50 rounded-full"
                    title="Delete image"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {images.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="text-base font-medium text-gray-700 mb-2">No Images Found</h3>
            <p className="text-sm text-gray-600 text-center max-w-sm mb-3">
              Upload your first satellite image to get started with the annotation tool.
            </p>
            <div>
              <ImageUpload onUploadSuccess={fetchImages} />
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-md max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Delete Image?</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this image? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteImage}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageGallery;