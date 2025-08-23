import React, { useState, useEffect } from 'react';
import './Accessibility.css';

const Accessibility = () => {
  const [fontSize, setFontSize] = useState('normal');
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    // Apply accessibility settings to the document using variables
    const root = document.documentElement;
    root.setAttribute('data-font-size', fontSize);
    root.setAttribute('data-theme', theme);
  }, [fontSize, theme]);

  return (
    <div className="accessibilityPanel_container">
      <h3 className="accessibilityPanel_heading">Accessibility Settings</h3>
      
      <div className="accessibilityPanel_settingGroup">
        <label htmlFor="accessibilityPanel_fontSize" className="accessibilityPanel_label">Font Size:</label>
        <select 
          id="accessibilityPanel_fontSize"
          className="accessibilityPanel_select"
          value={fontSize}
          onChange={(e) => setFontSize(e.target.value)}
        >
          <option value="small">Small</option>
          <option value="normal">Normal</option>
          <option value="large">Large</option>
          <option value="extra-large">Extra Large</option>
        </select>
      </div>

      <div className="accessibilityPanel_settingGroup">
        <label htmlFor="accessibilityPanel_theme" className="accessibilityPanel_label">Theme:</label>
        <select 
          id="accessibilityPanel_theme"
          className="accessibilityPanel_select"
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </div>
    </div>
  );
};

export default Accessibility;