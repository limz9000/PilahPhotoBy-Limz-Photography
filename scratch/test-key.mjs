const apiKey = "AIzaSyCABFAh_El7PVHqzsMtu4DJWdxmXJX2gV4";

async function testKey() {
  const url = `https://www.googleapis.com/drive/v3/files?key=${apiKey}&pageSize=1`;
  console.log("Testing URL:", url);
  try {
    const res = await fetch(url);
    console.log("HTTP Status:", res.status, res.statusText);
    const data = await res.json();
    console.log("Response:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Fetch error:", err);
  }
}

testKey();

