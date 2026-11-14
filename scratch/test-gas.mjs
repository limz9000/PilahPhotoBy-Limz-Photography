async function testGAS(link) {
  const url = `https://script.google.com/macros/s/AKfycbxo0QwfDtbRwANqP_989j3-LJtRtsEZ6QCW5aaHQVvb4AXWfR2Zv18QHP6WKoraNu_I/exec?folder=${encodeURIComponent(link)}`;
  console.log("Calling GAS URL:", url);
  try {
    const res = await fetch(url);
    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Output preview:", text.substring(0, 300));
  } catch (err) {
    console.error("Error:", err);
  }
}

testGAS("https://drive.google.com/drive/folders/1bU97S_DEMO");
