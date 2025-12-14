Create a New Folder on your Chromebook (e.g., in your Downloads folder) and name it MultiAutoDisabler.
Create Two Text Files inside that new folder:
manifest.json
background.js
Open the Text Editor (Text App or Caret) on your Chromebook.
Copy the content from the first section below (for manifest.json) and paste it into the matching file you created. Save and close the file.
Copy the content from the second section below (for background.js) and paste it into the matching file you created. Save and close the file.
Open Google Chrome and navigate to chrome://extensions.
Enable "Developer mode" using the toggle switch in the top-right corner of the page.
Click the Load unpacked button that appears.
Select the MultiAutoDisabler folder you created in Step 1, and click Open.
The "Multi-Extension Auto Disabler (3s)" extension is now active and running. It will automatically disable the two target extensions every 3 seconds.
📄 File Content 1: manifest.json
Copy the text below exactly as it appears and save it into your manifest.json file:
json
{
  "manifest_version": 3,
  "name": "Multi-Extension Auto Disabler (3s)",
  "version": "1.1",
  "permissions": ["management"],
  "background": {
    "service_worker": "background.js"
  }
}
Use code with caution.

📄 File Content 2: background.js
Copy the text below exactly as it appears and save it into your background.js file:
javascript
// Array of target extension IDs to manage
const targetExtensionIds = [
    'ddoicmjgiijnfdlmceohgdlmfnboaeca',
    'ifinpabiejbjobcphhaomiifjibpkjlf'
];

const intervalTime = 3000; // 3 seconds in milliseconds

/**
 * Checks and disables a specific extension by its ID if it is currently enabled.
 * @param {string} extensionId The ID of the extension to check.
 */
function checkAndDisableExtension(extensionId) {
    chrome.management.get(extensionId, (info) => {
        if (chrome.runtime.lastError) {
            console.error(`Manager Error: Could not retrieve info for ID ${extensionId}. ${chrome.runtime.lastError.message}`);
            return;
        }

        if (info && info.enabled) {
            // If the extension is enabled, disable it.
            chrome.management.setEnabled(extensionId, false, () => {
                if (chrome.runtime.lastError) {
                    console.error(`Manager Error: Failed to disable ${info.name} (${extensionId}). ${chrome.runtime.lastError.message}`);
                } else {
                    console.log(`✅ Success: Disabled extension "${info.name}".`);
                }
            });
        }
        // else { console.log(`ℹ️ Status: Extension ${extensionId} already disabled or not found.`); }
    });
}

/**
 * Main function that runs on the interval.
 */
function runExtensionManagementCheck() {
    console.log(`--- Running Extension Check @ ${new Date().toLocaleTimeString()} ---`);
    targetExtensionIds.forEach(id => {
        checkAndDisableExtension(id);
    });
}

// Start the continuous interval loop
setInterval(runExtensionManagementCheck, intervalTime);

console.log("Multi-Extension Auto Disabler script initialized. Checking every 3 seconds.");
Use
