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
        // Create a new tab for the "please wait" dialog
        chrome.tabs.create({url: chrome.runtime.getURL('loading.html')}, function (loadingTab) {
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
                    console.log("API Response:", data);
                    
                    generateResultHTML(data, info.srcUrl, function(htmlContent) {
                        chrome.tabs.remove(loadingTab.id);
                        chrome.tabs.create({url: 'data:text/html;charset=UTF-8,' + encodeURIComponent(htmlContent)});
                    });
                })
                .catch(error => {
                    console.error("Error:", error);

                    generateErrorHTML(error, function(htmlContent) {
                        chrome.tabs.remove(loadingTab.id);
                        chrome.tabs.create({url: 'data:text/html;charset=UTF-8,' + encodeURIComponent(htmlContent)});
                    });
                });
        });
    }
});

function loadFile(filename, callback) {
    fetch(chrome.runtime.getURL(filename))
        .then(response => {
        if (!response.ok) {
            throw new Error(`Failed to fetch ${filename}: ${response.status} ${response.statusText}`);
        }
        return response.text();
        })
        .then(callback)
    .catch(error => console.error(error));
}
  
function generateResultHTML(data, orig_img_src, callback) {
    loadFile('result-template.html', function(htmlContent) {
        const resultMessageWithBreaks = data.message.replace(/\n/g, '<br>');
        const resultHTML = htmlContent.replace('{{resultMessage}}', resultMessageWithBreaks)
                                      .replace('{{imageUrl}}', orig_img_src);
        callback(resultHTML);
    });
}

function generateErrorHTML(error, callback) {
    loadFile('error-template.html', function(htmlContent) {
        const errorMessageWithBreaks = data.message.replace(/\n/g, '<br>');
        const errorHTML = htmlContent.replace('{{errorMessage}}', errorMessageWithBreaks);
        callback(errorHTML);
    });
}
