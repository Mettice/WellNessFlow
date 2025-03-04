import React, { useState, useEffect } from 'react';
import { ClipboardDocumentIcon, CheckIcon } from '@heroicons/react/24/outline';
import axios from 'axios';

interface WidgetGeneratorProps {
  theme: string;
  spaId: string;
}

const WidgetGenerator: React.FC<WidgetGeneratorProps> = ({ theme, spaId }) => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [customization, setCustomization] = useState({
    position: 'right',
    buttonColor: '#8CAC8D',
    buttonText: 'Chat with us',
    headerText: 'Spa Assistant',
    placeholder: 'Type your message...',
    language: 'en'
  });

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Fetch initial widget status
    const fetchWidgetStatus = async () => {
      try {
        const response = await axios.get('/api/admin/widget/status');
        setIsEnabled(response.data.enabled);
      } catch (error) {
        console.error('Error fetching widget status:', error);
      }
    };
    fetchWidgetStatus();
  }, []);

  const toggleWidget = async () => {
    try {
      const response = await axios.post('/api/admin/widget/toggle', {
        enabled: !isEnabled
      });
      setIsEnabled(response.data.enabled);
    } catch (error) {
      console.error('Error toggling widget:', error);
    }
  };

  const scriptCode = `<script
  src="https://wellnessflow.com/widget.js"
  data-spa-id="${spaId}"
  data-position="${customization.position}"
  data-button-color="${customization.buttonColor}"
  data-button-text="${customization.buttonText}"
  data-header-text="${customization.headerText}"
  data-placeholder="${customization.placeholder}"
  data-language="${customization.language}"
></script>`;

  const reactCode = `import { ChatWidget } from '@wellnessflow/react';

const YourComponent = () => (
  <ChatWidget
    spaId="${spaId}"
    position="${customization.position}"
    buttonColor="${customization.buttonColor}"
    buttonText="${customization.buttonText}"
    headerText="${customization.headerText}"
    placeholder="${customization.placeholder}"
    language="${customization.language}"
  />
);`;

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`glass-card ${theme === 'dark' ? 'bg-dark-300' : 'bg-white'}`}>
      <h2 className={`text-xl font-semibold mb-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
        Chat Widget Generator
      </h2>

      {/* Enable/Disable Toggle */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className={`text-lg font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Enable Chat Widget
          </h3>
          <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>
            Show the chat widget on your booking page
          </p>
        </div>
        <div className="flex items-center">
          <span className="mr-3">{isEnabled ? 'Enabled' : 'Disabled'}</span>
          <button
            onClick={toggleWidget}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 ${
              isEnabled ? 'bg-indigo-600' : 'bg-gray-200'
            }`}
            role="switch"
            aria-checked={isEnabled}
          >
            <span
              aria-hidden="true"
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                isEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Customization Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div>
          <label className={`block mb-2 text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
            Position
          </label>
          <select
            value={customization.position}
            onChange={(e) => setCustomization({ ...customization, position: e.target.value })}
            className={`w-full p-2 rounded-md ${
              theme === 'dark' ? 'bg-dark-400 text-white' : 'bg-gray-50 text-gray-900'
            }`}
          >
            <option value="right">Bottom Right</option>
            <option value="left">Bottom Left</option>
          </select>
        </div>

        <div>
          <label className={`block mb-2 text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
            Button Color
          </label>
          <input
            type="color"
            value={customization.buttonColor}
            onChange={(e) => setCustomization({ ...customization, buttonColor: e.target.value })}
            className="w-full p-1 rounded-md h-10"
          />
        </div>

        <div>
          <label className={`block mb-2 text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
            Button Text
          </label>
          <input
            type="text"
            value={customization.buttonText}
            onChange={(e) => setCustomization({ ...customization, buttonText: e.target.value })}
            className={`w-full p-2 rounded-md ${
              theme === 'dark' ? 'bg-dark-400 text-white' : 'bg-gray-50 text-gray-900'
            }`}
          />
        </div>

        <div>
          <label className={`block mb-2 text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
            Header Text
          </label>
          <input
            type="text"
            value={customization.headerText}
            onChange={(e) => setCustomization({ ...customization, headerText: e.target.value })}
            className={`w-full p-2 rounded-md ${
              theme === 'dark' ? 'bg-dark-400 text-white' : 'bg-gray-50 text-gray-900'
            }`}
          />
        </div>

        <div>
          <label className={`block mb-2 text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
            Placeholder Text
          </label>
          <input
            type="text"
            value={customization.placeholder}
            onChange={(e) => setCustomization({ ...customization, placeholder: e.target.value })}
            className={`w-full p-2 rounded-md ${
              theme === 'dark' ? 'bg-dark-400 text-white' : 'bg-gray-50 text-gray-900'
            }`}
          />
        </div>

        <div>
          <label className={`block mb-2 text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
            Language
          </label>
          <select
            value={customization.language}
            onChange={(e) => setCustomization({ ...customization, language: e.target.value })}
            className={`w-full p-2 rounded-md ${
              theme === 'dark' ? 'bg-dark-400 text-white' : 'bg-gray-50 text-gray-900'
            }`}
          >
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
            <option value="it">Italian</option>
            <option value="pt">Portuguese</option>
            <option value="nl">Dutch</option>
            <option value="pl">Polish</option>
            <option value="ru">Russian</option>
            <option value="ja">Japanese</option>
            <option value="ko">Korean</option>
            <option value="zh">Chinese</option>
          </select>
        </div>
      </div>

      {/* Script Code */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h3 className={`text-lg font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Script Installation
          </h3>
          <button
            onClick={() => handleCopy(scriptCode)}
            className={`flex items-center px-3 py-1 rounded-md ${
              theme === 'dark' ? 'bg-dark-400 text-white' : 'bg-gray-100 text-gray-700'
            } hover:opacity-80`}
          >
            {copied ? (
              <CheckIcon className="h-5 w-5 mr-1 text-green-500" />
            ) : (
              <ClipboardDocumentIcon className="h-5 w-5 mr-1" />
            )}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <pre className={`p-4 rounded-md overflow-x-auto ${
          theme === 'dark' ? 'bg-dark-400 text-white' : 'bg-gray-50 text-gray-900'
        }`}>
          <code>{scriptCode}</code>
        </pre>
      </div>

      {/* React Code */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <h3 className={`text-lg font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            React Installation
          </h3>
          <button
            onClick={() => handleCopy(reactCode)}
            className={`flex items-center px-3 py-1 rounded-md ${
              theme === 'dark' ? 'bg-dark-400 text-white' : 'bg-gray-100 text-gray-700'
            } hover:opacity-80`}
          >
            {copied ? (
              <CheckIcon className="h-5 w-5 mr-1 text-green-500" />
            ) : (
              <ClipboardDocumentIcon className="h-5 w-5 mr-1" />
            )}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <pre className={`p-4 rounded-md overflow-x-auto ${
          theme === 'dark' ? 'bg-dark-400 text-white' : 'bg-gray-50 text-gray-900'
        }`}>
          <code>{reactCode}</code>
        </pre>
      </div>

      {/* Preview */}
      <div className="mt-8">
        <h3 className={`text-lg font-medium mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Preview
        </h3>
        <div className={`p-4 rounded-md ${theme === 'dark' ? 'bg-dark-400' : 'bg-gray-50'}`}>
          <div
            className="flex items-center justify-center px-4 py-2 rounded-full cursor-pointer"
            style={{ backgroundColor: customization.buttonColor }}
          >
            <span className="text-white">{customization.buttonText}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WidgetGenerator; 