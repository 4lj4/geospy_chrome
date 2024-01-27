console.log('Content script is running');

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    console.log('Received message:', request);

    if (request.action === 'geospyImageSearch') {
        console.log('Custom tool logic:', request.imageUrl);

        fetch(request.imageUrl)
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
                fetch("https://us-central1-phaseoneai.cloudfunctions.net/locate_image", {
                    method: "POST",
                    body: formData,
                })
                .then(response => response.json())
                .then(data => {
                    // Handle the API response as needed
                    console.log("API Response:", data);
                })
                .catch(error => {
                    // Handle errors
                    console.error("Error:", error);
                });

                // Rest of the code
            })
            .catch(error => {
                console.error('Fetch error:', error);
            });
        return true;
    }
});
