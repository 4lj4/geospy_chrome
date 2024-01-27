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
        console.log("Sending message to content script");

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
                // Generate HTML content with the result
                const htmlContent = generateHTML(data);

                // Create a new tab with the generated HTML content
                chrome.tabs.create({url: 'data:text/html;charset=UTF-8,' + encodeURIComponent(htmlContent)});

                console.log("API Response:", data);
            })
            .catch(error => {
                // Handle errors
                console.error("Error:", error);
            });
    }
});

function generateHTML(data) {
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>GeoSpy Image Search Result</title>
        </head>
        <body>
            <div id="result">${JSON.stringify(data)}</div>
        </body>
        </html>
    `;
}
