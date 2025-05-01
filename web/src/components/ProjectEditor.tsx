import { useState, useRef } from 'react';
import { ProjectService } from '../services/ProjectService';
import { ViaAttribute } from '../models/Project';
import FileManager from './FileManager';
import AttributeEditor from './AttributeEditor';

interface ProjectEditorProps {
  onSelectImage: (imageId: string) => void;
}

const ProjectEditor: React.FC<ProjectEditorProps> = ({ onSelectImage }) => {
  const projectService = useRef(new ProjectService());
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [files, setFiles] = useState<string[]>([]);
  const [fileAttributes, setFileAttributes] = useState<Record<string, string>>({});
  const [projectName, setProjectName] = useState('via_project_' + new Date().toISOString().substring(0, 10).replace(/-/g, ''));  // Create visual preview of image
  const createImagePreview = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve(reader.result as string);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Handle file operations
  const handleAddFiles = async (newFiles: File[]) => {
    try {
      // Filter out non-image files
      const imageFiles = newFiles.filter(file => file.type.startsWith('image/'));
      if (imageFiles.length === 0) {
        console.error("No valid image files were selected");
        return;
      }
      
      const newFileNames = imageFiles.map((file) => file.name);
      setFiles(prevFiles => [...prevFiles, ...newFileNames]);
      
      // Add to project service and keep track of first file ID
      let firstImageId = '';
      
      // Process each file
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        const imageId = `image_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        
        if (i === 0) {
          firstImageId = imageId;
        }
        
        // Create a preview to associate with the image
        await createImagePreview(file);
        
        // Add the image to the project service
        projectService.current.addImage(imageId, {
          filename: file.name,
          size: file.size,
          file_attributes: {
            type: file.type,
            lastModified: String(file.lastModified)
          },
        });
      }
      
      // If we have images, select the first one
      if (firstImageId && imageFiles.length > 0) {
        setCurrentFile(imageFiles[0].name);
        console.log(`Selecting image: ${firstImageId}`);
        onSelectImage(firstImageId);
      }
    } catch (error) {
      console.error('Error processing files:', error);
    }
  };  // URL-based image upload has been removed

  const handleRemoveFile = (file: string) => {
    setFiles(files.filter((f) => f !== file));
    // TODO: remove from project service
    
    // If the removed file was selected, clear selection
    if (currentFile === file) {
      setCurrentFile(null);
    }
  };  const handleSelectFile = (file: string) => {
    setCurrentFile(file);
    
    // Find the imageId for the selected file
    const imageIds = projectService.current.getImages();
    
    // Debug information
    console.log(`Searching for file: ${file}`);
    console.log(`Available image IDs: ${imageIds.join(', ')}`);
    
    for (const imageId of imageIds) {
      const metadata = projectService.current.getImageMetadata(imageId);
      console.log(`Checking imageId ${imageId}: ${metadata?.filename}`);
      
      if (metadata && metadata.filename === file) {
        console.log(`Found match! Selecting image ID: ${imageId}`);
        onSelectImage(imageId);
        return;
      }
    }
    
    console.warn(`No matching image found for filename: ${file}`);
  };

  // Handle attribute changes
  const handleFileAttributeChange = (name: string, value: string) => {
    setFileAttributes({ ...fileAttributes, [name]: value });
    // TODO: update in project service if currentFile exists
  };

  const handleAddRegionAttribute = (name: string, attribute: ViaAttribute) => {
    projectService.current.addRegionAttribute(name, attribute);
    // Force re-render by creating a new state object
    setFileAttributes({ ...fileAttributes });
  };

  const handleAddFileAttribute = (name: string, attribute: ViaAttribute) => {
    projectService.current.addFileAttribute(name, attribute);
    // Force re-render by creating a new state object
    setFileAttributes({ ...fileAttributes });
  };

  // Export project
  const handleExportProject = async () => {
    try {
      projectService.current.setProjectName(projectName);
      const blob = await projectService.current.saveProject();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectName}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export project', error);
    }
  };
  return (
    <div className="flex flex-col text-xs">
      <div className="flex flex-col space-y-2 mb-2">
        <div className="flex items-center space-x-1">
          <label className="block text-gray-600">Name:</label>
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="border-gray-300 rounded p-1 flex-grow text-xs"
          />
        </div>
        <button
          onClick={handleExportProject}
          className="w-full px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 rounded border border-gray-300"
        >
          Export Project
        </button>
      </div>
      
      <div className="flex-1 overflow-auto">        <FileManager
          files={files}
          currentFile={currentFile}
          onSelectFile={handleSelectFile}
          onAddFiles={handleAddFiles}
          onRemoveFile={handleRemoveFile}
        />
      </div>
        <div className="mt-2 border-t pt-2">
        <AttributeEditor
          type="file"
          attributes={projectService.current.getFileAttributes()}
          values={fileAttributes}
          onValueChange={handleFileAttributeChange}
          onAddAttribute={handleAddFileAttribute}
        />
      </div>
      
      <div className="mt-2 border-t pt-2">
        <AttributeEditor
          type="region"
          attributes={projectService.current.getRegionAttributes()}
          values={{}}
          onValueChange={() => {/* No-op for region attributes at this level */}}
          onAddAttribute={handleAddRegionAttribute}
        />
      </div>
    </div>
  );
};

export default ProjectEditor;
