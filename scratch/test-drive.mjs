// Test fetching public Google Drive folder
const testFolderUrl = "https://drive.google.com/drive/folders/1w7cR8h3rC_QcE_EXAMPLE";

async function testFetch(folderId) {
  const url1 = `https://drive.google.com/drive/folders/${folderId}`;
  const res1 = await fetch(url1, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    }
  });
  console.log("Status folders:", res1.status);
  const text1 = await res1.text();
  console.log("Length:", text1.length);
  const hasAF = text1.includes("AF_initDataCallback");
  console.log("Has AF_initDataCallback:", hasAF);
}

testFetch("0B123456789");

