import React from 'react';

interface FileManagerProps {
  files: string[];
  currentFile: string | null;
  onSelectFile: (file: string) => void;
  onAddFiles: (files: File[]) => void;
  onRemoveFile: (file: string) => void;
}

const FileManager: React.FC<FileManagerProps> = ({
  files,
  currentFile,
  onSelectFile,
  onAddFiles,
  onRemoveFile,
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onAddFiles(Array.from(e.target.files));
    }
  };
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Files ({files.length})</h3>      <div className="max-h-32 overflow-y-auto border rounded bg-white">
        {files.length > 0 ? (
          <div>
            {files.map((file) => (
              <div
                key={file}
                className={`flex items-center justify-between p-1 border-b text-xs ${
                  currentFile === file ? 'bg-blue-50' : 'hover:bg-gray-50'
                }`}
              >
                <button
                  onClick={() => onSelectFile(file)}
                  className="text-left flex-1 truncate"
                >
                  {file}
                </button>
                <button
                  onClick={() => onRemoveFile(file)}
                  className="text-red-500 hover:text-red-700 px-1"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-2 text-xs text-gray-500 text-center">
            <p>No images added</p>
          </div>
        )}
      </div><div className="space-y-2">        <div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center px-2 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
          >
            <span className="mr-1">+</span>
            Add Images
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            multiple
            accept="image/*"
            className="hidden"
          />
        </div>
      </div>
    </div>
  );
};

export default FileManager;
