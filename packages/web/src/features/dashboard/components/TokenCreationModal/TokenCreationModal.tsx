import { useState } from 'react';
import { Modal } from '~/components/ui/Modal';
import { Button, Input, Text } from '~/shared/ui';

interface TokenCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateToken: (name: string, maxTunnels: number) => Promise<void> | void;
}

const TokenCreationModal = ({ isOpen, onClose, onCreateToken }: TokenCreationModalProps) => {
  const [newTokenName, setNewTokenName] = useState('');
  const [newTokenMaxTunnels, setNewTokenMaxTunnels] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTokenName.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onCreateToken(newTokenName.trim(), newTokenMaxTunnels);
      setNewTokenName('');
      setNewTokenMaxTunnels(5);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onClose();
    setNewTokenName('');
    setNewTokenMaxTunnels(5);
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create a tunnel key">
      <form className="grid gap-4" onSubmit={handleCreateToken}>
        <div>
          <label className="text-xs font-semibold text-slate-600" htmlFor="tokenName">
            Key name
          </label>
          <Input
            className="mt-2 rounded-2xl"
            id="tokenName"
            type="text"
            value={newTokenName}
            onChange={(e) => setNewTokenName(e.target.value)}
            placeholder="MacBook, staging API, webhook test"
            required
            autoFocus
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-600" htmlFor="maxTunnels">
            Maximum tunnels
          </label>
          <Input
            className="mt-2 rounded-2xl"
            id="maxTunnels"
            type="number"
            value={newTokenMaxTunnels}
            onChange={(e) => setNewTokenMaxTunnels(Number.parseInt(e.target.value, 10) || 1)}
            min={1}
            max={100}
            required
          />
          <Text className="mt-2 text-xs leading-5" variant="muted">
            Set how many local apps this key can expose at the same time.
          </Text>
        </div>

        <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            className="rounded-2xl"
            type="button"
            onClick={handleClose}
          >
            Cancel
          </Button>
          <Button
            className="rounded-2xl"
            type="submit"
            disabled={!newTokenName.trim() || isSubmitting}
            variant="primary"
          >
            {isSubmitting ? 'Creating...' : 'Create key'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default TokenCreationModal;
