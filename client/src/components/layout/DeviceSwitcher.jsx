import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDevice } from '../../context/DeviceContext';

export default function DeviceSwitcher() {
  const { devices, selectedDeviceId, selectDevice } = useDevice();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  const close = useCallback(() => {
    setOpen(false);
    buttonRef.current?.focus();
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e) {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target) &&
        !buttonRef.current.contains(e.target)
      ) {
        close();
      }
    }
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open, close]);

  // Keyboard: Escape + Arrow keys on the menu container
  const handleMenuKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        return;
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const items = menuRef.current?.querySelectorAll('[role="menuitem"]');
        if (!items || items.length === 0) return;
        const activeIndex = Array.from(items).indexOf(document.activeElement);
        let nextIndex;
        if (e.key === 'ArrowDown') {
          nextIndex = activeIndex < items.length - 1 ? activeIndex + 1 : 0;
        } else {
          nextIndex = activeIndex > 0 ? activeIndex - 1 : items.length - 1;
        }
        items[nextIndex].focus();
      }
    },
    [close],
  );

  const handleToggle = () => setOpen((prev) => !prev);

  // After opening, focus the selected item (or first)
  useEffect(() => {
    if (!open || !menuRef.current) return;
    const items = menuRef.current.querySelectorAll('[role="menuitem"]');
    if (!items.length) return;
    const selectedIndex = devices.findIndex((d) => d.deviceId === selectedDeviceId);
    const focusTarget = items[selectedIndex >= 0 ? selectedIndex : 0];
    focusTarget?.focus();
  }, [open, devices, selectedDeviceId]);

  const handleSelectDevice = (id) => {
    selectDevice(id);
    close();
  };

  const handleAddDevice = () => {
    navigate('/devices', { state: { openRequest: true } });
    close();
  };

  // If no selected device, render a disabled placeholder
  if (!selectedDeviceId) {
    return (
      <span className="font-mono font-body-sm text-body-sm font-medium text-on-background select-none">
        —
      </span>
    );
  }

  return (
    <div className="relative inline-block">
      {/* Trigger button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-1 rounded-md px-1 py-0.5 hover:bg-surface-container-low focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 transition-colors"
      >
        <span className="font-mono font-body-sm text-body-sm font-medium text-on-background">
          {selectedDeviceId}
        </span>
        <span
          className={`material-symbols-outlined text-[18px] text-secondary transition-transform duration-200 ${open ? 'rotate-180' : 'rotate-0'}`}
          aria-hidden="true"
        >
          expand_more
        </span>
      </button>

      {/* Dropdown menu */}
      {open && (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Device selector"
          onKeyDown={handleMenuKeyDown}
          className="absolute left-0 top-[calc(100%+6px)] z-50 min-w-[180px] rounded-lg border border-border-subtle bg-surface-white shadow-md py-1 focus:outline-none"
        >
          {/* Device rows */}
          {devices.map((device) => {
            const isSelected = device.deviceId === selectedDeviceId;
            return (
              <button
                key={device.deviceId}
                role="menuitem"
                type="button"
                tabIndex={-1}
                onClick={() => handleSelectDevice(device.deviceId)}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2 text-left focus:outline-none focus-visible:bg-surface-container-low hover:bg-surface-container-low transition-colors ${
                  isSelected ? 'bg-surface-container-low' : ''
                }`}
              >
                <span className="font-mono font-body-sm text-body-sm font-medium text-on-background">
                  {device.deviceId}
                </span>
                {isSelected && (
                  <span
                    className="material-symbols-outlined text-[16px] text-primary shrink-0"
                    aria-hidden="true"
                  >
                    check
                  </span>
                )}
              </button>
            );
          })}

          {/* Divider */}
          <div className="my-1 border-t border-border-subtle" role="separator" />

          {/* Request device row */}
          <button
            role="menuitem"
            type="button"
            tabIndex={-1}
            onClick={handleAddDevice}
            className="w-full flex items-center gap-2 px-3 py-2 text-left focus:outline-none focus-visible:bg-surface-container-low hover:bg-surface-container-low transition-colors"
          >
            <span
              className="material-symbols-outlined text-[16px] text-secondary shrink-0"
              aria-hidden="true"
            >
              add
            </span>
            <span className="font-label-caps text-label-caps font-semibold text-secondary uppercase tracking-wide">
              Request device
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
