import React from 'react';
import Button from '../../../../../../../webview/components/ui/Button';
import { MODELS } from '../../../shared/types';

interface ModelPickerProps {
  currentModel: string;
  onModelChange: (modelId: string) => void;
}

export const ModelPicker: React.FC<ModelPickerProps> = ({
  currentModel,
  onModelChange,
}) => {
  return (
    <div>
      <div className="grid grid-cols-2 gap-4">
        {MODELS.map((model) => (
          <Button
            key={model.id}
            onClick={() => onModelChange(model.id)}
            className={`${
              currentModel === model.id ? 'glass-brand' : 'glass-brand-dark'
            }`}
          >
            {model.label}
          </Button>
        ))}
      </div>
    </div>
  );
};
