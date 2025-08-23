import React, { createContext, useContext, useState, useEffect } from 'react';
import { FiSettings } from 'react-icons/fi';
import './Accessibility.css';

const AccessibilityContext = createContext();

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within AccessibilityProvider');
  }
  return context;
};

const AccessibilityProvider = ({ children }) => {
  const [settings, setSettings] = useState({
    fontSize: 'normal',
    theme: 'light', // Default to light theme
    reducedMotion: false,
    keyboardNavigation: true
  });

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [togglePosition, setTogglePosition] = useState({ x: 20, y: 20 });
  const [menuPosition, setMenuPosition] = useState({ x: 20, y: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    // Force light theme as default
    setSettings(prev => ({
      ...prev,
      theme: 'light'
    }));

    // Detect user preferences for reduced motion only
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      setSettings(prev => ({
        ...prev,
        reducedMotion: prefersReducedMotion
      }));
    }
  }, []);

  useEffect(() => {
    // Apply accessibility settings to document
    const root = document.documentElement;
    
    // Theme
    root.setAttribute('data-theme', settings.theme);
    // Font size
    root.setAttribute('data-font-size', settings.fontSize);
    // Keyboard navigation
    root.setAttribute('data-keyboard-navigation', settings.keyboardNavigation ? 'true' : 'false');

    // Reduced motion
    if (settings.reducedMotion) {
      root.style.setProperty('--animation-duration', '0s');
      root.style.setProperty('--transition-duration', '0s');
    } else {
      root.style.removeProperty('--animation-duration');
      root.style.removeProperty('--transition-duration');
    }

    // Save settings
    localStorage.setItem('accessibilitySettings', JSON.stringify(settings));
  }, [settings]);

  const updateSetting = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const resetSettings = () => {
    setSettings({
      fontSize: 'normal',
      theme: 'light',
      reducedMotion: false,
      keyboardNavigation: true
    });
  };

  const toggleAccessibilityMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // Drag functionality for toggle button
  const handleToggleMouseDown = (e) => {
    if (e.button !== 0) return; // Only left click

    setIsDragging(true);
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });

    e.preventDefault();
    e.stopPropagation();
  };

  // Drag functionality for menu header only
  const handleMenuHeaderMouseDown = (e) => {
    if (e.button !== 0) return; // Only left click

    setIsDragging(true);
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });

    e.preventDefault();
    e.stopPropagation();
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;

    const newX = Math.max(0, Math.min(window.innerWidth - 50, e.clientX - dragOffset.x));
    const newY = Math.max(0, Math.min(window.innerHeight - 50, e.clientY - dragOffset.y));

    setTogglePosition({ x: newX, y: newY });
    setMenuPosition({ x: newX, y: newY + 60 });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleToggleClick = (e) => {
    if (!isDragging) {
      toggleAccessibilityMenu();
    }
  };

  // Add global mouse event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  // Keyboard navigation handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!settings.keyboardNavigation) return;

      // Alt + A to open accessibility menu
      if (e.altKey && e.key === 'a') {
        e.preventDefault();
        toggleAccessibilityMenu();
      }

      // Escape to close accessibility menu
      if (e.key === 'Escape' && isMenuOpen) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [settings.keyboardNavigation, isMenuOpen]);

  const value = {
    settings,
    updateSetting,
    resetSettings,
    isMenuOpen,
    toggleAccessibilityMenu
  };

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
      
      {/* Accessibility Menu */}
      <div
        className="accessibilityProvider_menu"
        style={{
          display: isMenuOpen ? 'block' : 'none',
          right: `${window.innerWidth - menuPosition.x - 300}px`,
          top: `${menuPosition.y}px`
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Accessibility Settings"
      >
        <div
          className="accessibilityProvider_header"
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
          onMouseDown={handleMenuHeaderMouseDown}
        >
          <h3 className="accessibilityProvider_title">Accessibility Settings</h3>
          <button
            onClick={() => setIsMenuOpen(false)}
            aria-label="Close accessibility menu"
            className="accessibilityProvider_closeBtn"
            type="button"
          >
            ×
          </button>
        </div>
        
        <div className="accessibilityProvider_controls">
          {/* Font Size */}
          <div className="accessibilityProvider_controlGroup">
            <label htmlFor="accessibilityProvider_fontSize" className="accessibilityProvider_label">Font Size:</label>
            <select
              id="accessibilityProvider_fontSize"
              className="accessibilityProvider_select"
              value={settings.fontSize}
              onChange={(e) => updateSetting('fontSize', e.target.value)}
            >
              <option value="small">Small</option>
              <option value="normal">Normal</option>
              <option value="large">Large</option>
              <option value="extra-large">Extra Large</option>
            </select>
          </div>

          {/* Theme */}
          <div className="accessibilityProvider_controlGroup">
            <label htmlFor="accessibilityProvider_theme" className="accessibilityProvider_label">Theme:</label>
            <select
              id="accessibilityProvider_theme"
              className="accessibilityProvider_select"
              value={settings.theme}
              onChange={(e) => updateSetting('theme', e.target.value)}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>

          {/* Reduced Motion */}
          <div className="accessibilityProvider_controlGroup">
            <label className="accessibilityProvider_checkboxLabel">
              <input
                type="checkbox"
                checked={settings.reducedMotion}
                onChange={(e) => updateSetting('reducedMotion', e.target.checked)}
                className="accessibilityProvider_checkbox"
              />
              Reduce Motion
            </label>
          </div>

          {/* Keyboard Navigation */}
          <div className="accessibilityProvider_controlGroup">
            <label className="accessibilityProvider_checkboxLabel">
              <input
                type="checkbox"
                checked={settings.keyboardNavigation}
                onChange={(e) => updateSetting('keyboardNavigation', e.target.checked)}
                className="accessibilityProvider_checkbox"
              />
              Enhanced Keyboard Navigation
            </label>
          </div>

          <button onClick={resetSettings} className="accessibilityProvider_resetBtn" type="button">
            Reset to Defaults
          </button>
        </div>
      </div>

      {/* Accessibility Toggle Button */}
      <button
        className="accessibilityProvider_toggle"
        style={{
          right: `${window.innerWidth - togglePosition.x - 50}px`,
          top: `${togglePosition.y}px`,
          cursor: isDragging ? 'grabbing' : 'move'
        }}
        onClick={handleToggleClick}
        onMouseDown={handleToggleMouseDown}
        aria-label="Open accessibility settings (Alt + A) - Drag to move"
        title="Accessibility Settings (Alt + A) - Drag to move"
        type="button"
      >
        <FiSettings size={28} />
      </button>

      {/* Skip to main content link */}
      <a href="#main-content" className="accessibilityProvider_skipLink">
        Skip to main content
      </a>
    </AccessibilityContext.Provider>
  );
};

export default AccessibilityProvider;
