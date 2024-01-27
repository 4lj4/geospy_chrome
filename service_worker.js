console.log("Geospy service worker is running");

/*
    Add the locate button to the context menu
*/
chrome.runtime.onInstalled.addListener(function () {
    chrome.contextMenus.create({
        id: "geospyImageSearch",
        title: "Locate using GeoSpy",
        contexts: ["image"]
    });
});

/*
    context menu onClicked callback
*/
chrome.contextMenus.onClicked.addListener(async function (info, tab) {
    if (info.menuItemId === "geospyImageSearch") {

        // Create the loading page, indicating that we are waiting for the API to respond
        const loadingTab = await chrome.tabs.create({ url: chrome.runtime.getURL('loading.html') }); 

        try {
            
            // Download the image selected to upload to geospy
            const blob = await fetchBlob(info.srcUrl);

            // Make request to the geospy API
            const response = await callGeospyAPI(blob);
            const response_json_data = await response.json(); // Parse the response JSON
            console.log("Geospy API response:", response_json_data);

            // Generate a result page
            const htmlContent = await async_generateResultHTML(response_json_data, info.srcUrl); 

            // Close the loading tab and show the result page HTML
            await chrome.tabs.remove(loadingTab.id);
            await chrome.tabs.create({ url: 'data:text/html;charset=UTF-8,' + encodeURIComponent(htmlContent) });

        } catch (error) {
            console.error("Geospy API error:", error);

            // Generate an error page
            const htmlContent = await async_generateErrorHTML(error);

            // Close the loading tab and show the error page HTML
            await chrome.tabs.remove(loadingTab.id);
            await chrome.tabs.create({ url: 'data:text/html;charset=UTF-8,' + encodeURIComponent(htmlContent) });
        }
    }
});

/*
    Returns the binary blob of a file at the give URL.
*/
async function fetchBlob(srcUrl) {
    const response = await fetch(srcUrl);
    if (!response.ok) {
        throw new Error('GET failed: ', response);
    }
    return response.blob();
}

/*
    Post the given blob to the geospy API, returns the raw response.
*/
async function callGeospyAPI(blob) {
    const formData = new FormData();
    formData.append("image", blob, "image.jpg");
    const response = await fetch("https://us-central1-phaseoneai.cloudfunctions.net/locate_image", {
        method: "POST",
        body: formData,
    });
    return response;
}

/*
    async wrapper around generateResultHTML
*/
async function async_generateResultHTML(response_json_data, srcUrl) {
    return new Promise((resolve) => {
        generateResultHTML(response_json_data, srcUrl, (htmlContent) => {
            resolve(htmlContent);
        });
    });
}

/*
    async wrapper around generateErrorHTML
*/
async function async_generateErrorHTML(error) {
    return new Promise((resolve) => {
        generateErrorHTML(error, (htmlContent) => {
            resolve(htmlContent);
        });
    });
}

/*
    "load" the given file (could be any url to be fair) then execute the provided callback
*/
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

/*
    Executes the provided callback with the HTML for a result page for the given json_data + img
*/
function generateResultHTML(json_data, orig_img_src, callback) {
    loadFile('result-template.html', function(htmlContent) {
        const resultMessageWithBreaks = json_data.message.replace(/\n/g, '<br>');
        const resultHTML = htmlContent.replace('{{resultMessage}}', resultMessageWithBreaks)
                                      .replace('{{imageUrl}}', orig_img_src);
        callback(resultHTML);
    });
}

/*
    Executes the provided callback with the HTML for an error page containing the provided error text
*/
function generateErrorHTML(error, callback) {
    loadFile('error-template.html', function(htmlContent) {
        const errorMessageWithBreaks = error.replace(/\n/g, '<br>');
        const errorHTML = htmlContent.replace('{{errorMessage}}', errorMessageWithBreaks);
        callback(errorHTML);
    });
}
