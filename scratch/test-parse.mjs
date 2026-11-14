function parseGasResponse(raw) {
  const match = raw.match(/^\s*\w+\s*\(([\s\S]*)\)\s*;?\s*$/);
  if (match) {
    return JSON.parse(match[1]);
  }
  return JSON.parse(raw);
}

const sample = 'callback({"status":"error","error":"Folder tidak bisa dibuka."})';
console.log(parseGasResponse(sample));

