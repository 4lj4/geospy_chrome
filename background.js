// background.js
console.log("Background script is running");

chrome.runtime.onInstalled.addListener(function () {
    chrome.contextMenus.create({
        id: "geospyImageSearch",
        title: "Locate using GeoSpy",
        contexts: ["image"]
    });
});

chrome.contextMenus.onClicked.addListener(function (info, tab) {
    console.log("Context menu clicked");

    if (info.menuItemId === "geospyImageSearch") {
        console.log("geospyImageSearch");

        // Create a new tab with the result.html file
        chrome.tabs.create({url: chrome.extension.getURL('result.html')}, function (newTab) {
            fetch(info.srcUrl)
                .then(response => {
                    if (!response.ok) {
                        throw new Error('GET failed: ', response);
                    }
                    return response.blob();
                })
                .then(blob => {
                    console.log('Blob:', blob);

                    // Create a FormData object to send the image as multipart/form-data
                    const formData = new FormData();
                    formData.append("image", blob, "image.jpg");

                    // Make a POST request to the API endpoint
                    return fetch("https://us-central1-phaseoneai.cloudfunctions.net/locate_image", {
                        method: "POST",
                        body: formData,
                    });
                })
                .then(response => response.json())
                .then(data => {
                    // Inject the result into the new tab
                    chrome.tabs.executeScript(newTab.id, {
                        code: `document.getElementById('result').innerText = ${JSON.stringify(data)};`
                    });

                    console.log("API Response:", data);
                })
                .catch(error => {
                    // Handle errors
                    console.error("Error:", error);
                });
        });
    }
});
