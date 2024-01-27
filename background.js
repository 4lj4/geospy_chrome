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
        chrome.tabs.create({url: chrome.extension.getURL('test.html')});

        // Send a message to the content script with the image URL
        chrome.tabs.sendMessage(tab.id, { action: "geospyImageSearch", imageUrl: info.srcUrl });
    }
});
