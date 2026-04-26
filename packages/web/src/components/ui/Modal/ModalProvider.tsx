import { useEffect, useRef, type ReactNode } from 'react';
import {
  ModalProvider as ReactUiModalProvider,
  type AlertComponentProps,
  type ConfirmComponentProps
} from '@baejino/react-ui/modal';
import * as AlertDialog from '@baejino/react-ui/modal/alert-dialog';

interface AppModalProviderProps {
  children: ReactNode;
}

const overlayClassName = 'fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm';
const contentClassName =
  'fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-sky-100 bg-white p-6 shadow-2xl outline-none';
const buttonClassName =
  'inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-semibold transition focus:outline-none focus:ring-4';

function AlertModal({ open, options, onClose }: AlertComponentProps) {
  const handledRef = useRef(false);

  useEffect(() => {
    if (open) {
      handledRef.current = false;
    }
  }, [open]);

  const close = () => {
    handledRef.current = true;
    onClose();
  };

  return (
    <AlertDialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && options.dismissible && !handledRef.current) {
          onClose();
        }
      }}
    >
      <AlertDialog.Portal>
        <AlertDialog.Overlay className={overlayClassName} />
        <AlertDialog.Content className={contentClassName}>
          <AlertDialog.Title className="text-lg font-semibold tracking-tight text-slate-950">
            {options.title}
          </AlertDialog.Title>
          {options.description ? (
            <AlertDialog.Description className="mt-3 text-sm leading-6 text-slate-600">
              {options.description}
            </AlertDialog.Description>
          ) : null}
          <div className="mt-6 flex justify-end">
            <AlertDialog.Action
              className={`${buttonClassName} bg-sky-500 text-white hover:bg-sky-600 focus:ring-sky-100`}
              onClick={close}
            >
              {options.confirmLabel}
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

function ConfirmModal({ open, options, onCancel, onConfirm }: ConfirmComponentProps) {
  const handledRef = useRef(false);
  const isDanger = options.tone === 'danger';

  useEffect(() => {
    if (open) {
      handledRef.current = false;
    }
  }, [open]);

  const cancel = () => {
    handledRef.current = true;
    onCancel();
  };

  const confirm = () => {
    handledRef.current = true;
    onConfirm();
  };

  return (
    <AlertDialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && options.dismissible && !handledRef.current) {
          onCancel();
        }
      }}
    >
      <AlertDialog.Portal>
        <AlertDialog.Overlay className={overlayClassName} />
        <AlertDialog.Content className={contentClassName}>
          <AlertDialog.Title className="text-lg font-semibold tracking-tight text-slate-950">
            {options.title}
          </AlertDialog.Title>
          {options.description ? (
            <AlertDialog.Description className="mt-3 text-sm leading-6 text-slate-600">
              {options.description}
            </AlertDialog.Description>
          ) : null}
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <AlertDialog.Cancel
              className={`${buttonClassName} border border-sky-100 bg-white text-sky-800 hover:bg-sky-50 focus:ring-sky-100`}
              onClick={cancel}
            >
              {options.cancelLabel}
            </AlertDialog.Cancel>
            <AlertDialog.Action
              className={`${buttonClassName} ${
                isDanger
                  ? 'bg-rose-500 text-white hover:bg-rose-600 focus:ring-rose-100'
                  : 'bg-sky-500 text-white hover:bg-sky-600 focus:ring-sky-100'
              }`}
              onClick={confirm}
            >
              {options.confirmLabel}
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

export function AppModalProvider({ children }: AppModalProviderProps) {
  return (
    <ReactUiModalProvider
      components={{
        Alert: AlertModal,
        Confirm: ConfirmModal
      }}
    >
      {children}
    </ReactUiModalProvider>
  );
}
