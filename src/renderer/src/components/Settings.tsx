import React, { useEffect, useState } from 'react'
import { useCarplayStore } from '../store/store'
import { ExtraConfig } from '../../../main/Globals'

interface SettingsProps {
  settings: ExtraConfig
  onSettingsChange: (settings: ExtraConfig) => void
}

function Settings({ settings, onSettingsChange }: SettingsProps): JSX.Element {
  const [localSettings, setLocalSettings] = useState<ExtraConfig>(settings)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    setLocalSettings(settings)
  }, [settings])

  const handleChange = (key: keyof ExtraConfig, value: any) => {
    const newSettings = { ...localSettings, [key]: value }
    setLocalSettings(newSettings)
    onSettingsChange(newSettings)
  }

  return (
    <div className="settings-container">
      <button className="settings-button" onClick={() => setIsOpen(!isOpen)}>
        Settings
      </button>
      {isOpen && (
        <div className="settings-panel">
          <div className="settings-group">
            <h3>Performance</h3>
            <div className="setting-item">
              <label>FPS:</label>
              <input
                type="number"
                value={localSettings.fps}
                onChange={(e) => handleChange('fps', parseInt(e.target.value))}
                min="1"
                max="60"
              />
            </div>
            <div className="setting-item">
              <label>Media Delay (ms):</label>
              <input
                type="number"
                value={localSettings.mediaDelay}
                onChange={(e) => handleChange('mediaDelay', parseInt(e.target.value))}
                min="0"
                max="1000"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Settings
