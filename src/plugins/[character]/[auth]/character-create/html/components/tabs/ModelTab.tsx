import React from 'react';
import Button from '../../../../../../../webview/components/ui/Button';
import { FaMars, FaVenus } from 'react-icons/fa6';
import { IconWrapper } from '../common';
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
            } flex flex-col items-center justify-center py-3`}
          >
            <IconWrapper size="1.5em" className="mb-1">
              {model.id === 'mp_m_freemode_01' ? <FaMars /> : <FaVenus />}
            </IconWrapper>
            <span>{model.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
};
