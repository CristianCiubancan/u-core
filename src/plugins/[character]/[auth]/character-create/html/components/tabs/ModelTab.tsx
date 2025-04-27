import React from 'react';
import Button from '../../../../../../../webview/components/ui/Button';
import { MODELS } from '../../types';

interface ModelTabProps {
  currentModel: string;
  onModelChange: (modelId: string) => void;
}

export const ModelTab: React.FC<ModelTabProps> = ({
  currentModel,
  onModelChange,
}) => {
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Select Character Model</h2>
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
