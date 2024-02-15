console.log("Geospy service worker is running");

const GEOSPY_API_URL = "https://locate-image-dev-7cs5mab6na-uc.a.run.app/"
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
    Used to get loading.html, result-template.html, and error-template.html
*/
async function getHTMLFile(url) {
    try {
        const response = await fetch(chrome.runtime.getURL(url));

        if (!response.ok) {
            throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
        }

        return await response.text();
    } catch (error) {
        console.error(error);f
        // You might want to handle the error appropriately or propagate it further.
        throw error;
    }
}

/*
    Construct a modified version of result-template.html with the provided json data and image
*/
async function generateResultHTML(json_data, orig_img_src) {
    try {
        const resultMessageWithBreaks = json_data.message.replace(/\n/g, '<br>');
        const htmlContent = await getHTMLFile('result-template.html');
        var resultHTML = htmlContent.replace('{{resultMessage}}', resultMessageWithBreaks)
                                    .replace('{{imageUrl}}', orig_img_src);
        return resultHTML;
    } catch (error) {
        console.error(error);
        return "error generating results for the following json data: " + JSON.stringify(json_data);
    }
}

/*
    Construct a modified version of error-template.html with the provided error
*/
async function generateErrorHTML(error) {
    try {
        const htmlContent = await getHTMLFile('error-template.html');
        const errorHTML = htmlContent.replace('{{errorMessage}}', error);
        return errorHTML;
    } catch (error) {
        console.error(error);
        return "error";
    }
}

/*
    Post the given blob to the geospy API, returns the raw response.
*/
async function callGeospyAPI(blob) {
    const formData = new FormData();
    formData.append("image", blob, "image.jpg");
    const response = await fetch(GEOSPY_API_URL, {
        method: "POST",
        body: formData,
    });
    return response;
}



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
            generateResultHTML(response_json_data, info.srcUrl).then(htmlContent => {
                // Close the loading tab and show the result page HTML
                chrome.tabs.create({ url: 'data:text/html;charset=UTF-8,' + encodeURIComponent(htmlContent) });
                chrome.tabs.remove(loadingTab.id);
            });

        } catch (error) {
            console.error("Error occured while attempting to interact with geospy API:", error);

            // Generate an error page
            generateErrorHTML(error).then(htmlContent => {
                // Close the loading tab and show the error page HTML
                chrome.tabs.remove(loadingTab.id);
                chrome.tabs.create({ url: 'data:text/html;charset=UTF-8,' + encodeURIComponent(htmlContent) });
            });
        }
    }
});
