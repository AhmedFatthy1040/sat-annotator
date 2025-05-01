import React, { useState } from 'react';
import { ViaAttribute } from '../models/Project';

interface AttributeEditorProps {
  type: 'region' | 'file';
  attributes: Record<string, ViaAttribute>;
  values: Record<string, string>;
  onValueChange: (name: string, value: string) => void;
  onAddAttribute: (name: string, attribute: ViaAttribute) => void;
}

const AttributeEditor: React.FC<AttributeEditorProps> = ({
  type,
  attributes,
  values,
  onValueChange,
  onAddAttribute,
}) => {
  const [newAttrName, setNewAttrName] = useState('');
  const [newAttrType, setNewAttrType] = useState('text');
  const [newAttrOptions, setNewAttrOptions] = useState('');

  const handleAddAttribute = () => {
    if (!newAttrName.trim()) return;

    const attribute: ViaAttribute = {
      type: newAttrType,
      description: '',
    };

    if (['dropdown', 'radio'].includes(newAttrType)) {
      attribute.options = newAttrOptions
        .split(',')
        .map((opt) => opt.trim())
        .filter((opt) => opt);
    }

    onAddAttribute(newAttrName.trim(), attribute);
    setNewAttrName('');
    setNewAttrOptions('');
  };
  const renderAttributeInput = (name: string, attr: ViaAttribute) => {
    const value = values[name] || '';

    switch (attr.type) {
      case 'checkbox':
        return (
          <input
            type="checkbox"
            checked={value === 'true'}
            onChange={(e) => onValueChange(name, e.target.checked.toString())}
            className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
        );
      case 'dropdown':
      case 'radio':
        return (
          <select
            value={value}
            onChange={(e) => onValueChange(name, e.target.value)}
            className="mt-1 block w-full text-xs border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded"
          >
            <option value="">Select...</option>
            {attr.options?.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        );
      default: // text
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => onValueChange(name, e.target.value)}
            className="mt-1 block w-full shadow-sm text-xs border-gray-300 rounded"
          />
        );
    }
  };  return (
    <div className="space-y-1">
      <div className="text-xs text-gray-500">
        {type === 'region' ? 'Region Attributes' : 'File Attributes'}
      </div>

      {Object.entries(attributes).length > 0 ? (
        <div className="max-h-24 overflow-y-auto border rounded bg-white">
          {Object.entries(attributes).map(([name, attr]) => (
            <div key={name} className="p-1 border-b text-xs">
              <div className="text-gray-600 mb-1">{name}</div>
              {renderAttributeInput(name, attr)}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-400">No attributes defined</p>
      )}      <div className="pt-1 mt-1 border-t border-gray-200">
        <div className="text-xs text-gray-500">Add Attribute</div>
        <div className="flex space-x-1 mt-1">
          <input
            type="text"
            value={newAttrName}
            onChange={(e) => setNewAttrName(e.target.value)}
            placeholder="Name"
            className="block w-1/3 text-xs border-gray-300 rounded"
          />
          <select
            value={newAttrType}
            onChange={(e) => setNewAttrType(e.target.value)}
            className="block w-1/3 text-xs border-gray-300 rounded"
          >
            <option value="text">Text</option>
            <option value="checkbox">Checkbox</option>
            <option value="dropdown">Dropdown</option>
            <option value="radio">Radio</option>
          </select>
          <button
            onClick={handleAddAttribute}
            className="flex-1 px-1 border border-gray-300 text-xs rounded bg-gray-50 hover:bg-gray-100"
          >
            Add
          </button>
        </div>
        {['dropdown', 'radio'].includes(newAttrType) && (
          <div className="mt-1">
            <input
              type="text"
              value={newAttrOptions}
              onChange={(e) => setNewAttrOptions(e.target.value)}
              placeholder="Options (comma separated)"
              className="block w-full text-xs border-gray-300 rounded"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default AttributeEditor;
