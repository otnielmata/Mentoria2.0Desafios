const mongoose = require("mongoose");

function firstNonEmpty(...values) {
  return values.find((value) => typeof value === "string" && value.trim()) || "";
}

function resolveDatabaseName(uri, explicitName, fallbackName) {
  if (explicitName && explicitName.trim()) return explicitName.trim();
  const match = String(uri || "").match(/^[a-z]+:\/\/[^/]+\/([^?]+)/i);
  if (match && match[1] && match[1].trim()) return decodeURIComponent(match[1].trim());
  return fallbackName;
}

async function openConnection(uri, dbName) {
  return mongoose.createConnection(uri, dbName ? { dbName } : {}).asPromise();
}

async function cloneDatabase({
  sourceUri,
  sourceDbName,
  targetUri,
  targetDbName,
  dropTarget = true,
}) {
  const sourceConnection = await openConnection(sourceUri, sourceDbName);
  const targetConnection = await openConnection(targetUri, targetDbName);

  try {
    const sourceDb = sourceConnection.db;
    const targetDb = targetConnection.db;

    if (dropTarget) {
      await targetDb.dropDatabase();
    }

    const collections = await sourceDb.listCollections({}, { nameOnly: true }).toArray();

    for (const { name } of collections) {
      const documents = await sourceDb.collection(name).find({}).toArray();
      if (documents.length > 0) {
        await targetDb.collection(name).insertMany(documents, { ordered: false });
      } else {
        await targetDb.createCollection(name);
      }

      const indexes = await sourceDb.collection(name).indexes();
      for (const index of indexes) {
        if (index.name === "_id_") continue;
        const { key, name: indexName, ...options } = index;
        await targetDb.collection(name).createIndex(key, {
          ...options,
          name: indexName,
        });
      }
    }

    return {
      collections: collections.length,
      sourceDbName: sourceDb.databaseName,
      targetDbName: targetDb.databaseName,
    };
  } finally {
    await sourceConnection.close();
    await targetConnection.close();
  }
}

async function main() {
  const sourceUri = firstNonEmpty(process.env.SOURCE_MONGODB_URI, process.env.MONGODB_URI);
  const targetUri = firstNonEmpty(process.env.TARGET_MONGODB_URI);

  if (!sourceUri || !targetUri) {
    throw new Error("Defina SOURCE_MONGODB_URI ou MONGODB_URI, e também TARGET_MONGODB_URI.");
  }

  const sourceDbName = resolveDatabaseName(
    sourceUri,
    process.env.SOURCE_MONGODB_DB_NAME,
    "mentoria_api"
  );
  const targetDbName = resolveDatabaseName(
    targetUri,
    process.env.TARGET_MONGODB_DB_NAME,
    "mentoria_api_dev"
  );
  const dropTarget = String(process.env.DROP_TARGET_DATABASE || "true").trim().toLowerCase() !== "false";

  const result = await cloneDatabase({
    sourceUri,
    sourceDbName,
    targetUri,
    targetDbName,
    dropTarget,
  });

  console.log(
    JSON.stringify({
      status: "ok",
      sourceDbName: result.sourceDbName,
      targetDbName: result.targetDbName,
      collections: result.collections,
      dropTarget,
    })
  );
}

main().catch((error) => {
  console.error(
    JSON.stringify({
      status: "error",
      message: error.message,
    })
  );
  process.exit(1);
});
