import { useCallback, useState } from 'react';
import { useNuiEvent } from '../../../../webview/hooks/useNuiEvent';
import { fetchNui } from '../../../../utils/fetchNui';

export default function Page() {
  const [isOpen, setIsOpen] = useState(false);

  useNuiEvent('example:toggle-ui', (data) => {
    if (data) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  });

  const handleCloseUi = useCallback(async () => {
    await fetchNui('example:toggle-ui', false);
  }, [fetchNui]);

  return isOpen ? (
    <div>
      <button onClick={handleCloseUi}>close</button>
    </div>
  ) : null;
}
