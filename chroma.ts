// npm install --save chromadb chromadb-default-embed

import { ChromaClient } from "chromadb";
const client = new ChromaClient({
  path: "https://api.trychroma.com:8000",
  auth: { provider: "token", credentials: 'ck-7PavmXE7TjKnF1Y2htCgygjsgC6ojcb6Ebxxg6DjGf24', tokenHeaderType: "X_CHROMA_TOKEN" },
  tenant: '34bbb9f5-79db-412d-b3df-3c99866b2467',
  database: 'joi'
});

const collection = await client.getOrCreateCollection({ name: "fruit" });
await collection.add({
  ids: ["1", "2", "3"],
  documents: ["apple", "oranges", "pineapple"],
});
console.log(await collection.query({ queryTexts: "hawaii", nResults: 1 }));
  
