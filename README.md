# PouchDB Context store plugin

The PouchDB Context store plugin holds context data in the PouchDB.

## Install

1. Run the following command in your Node-RED user directory - typically `~/.node-red`

    npm install git+https://github.com/node-red/node-red-context-pouchdb

2. Add a configuration in settings.js:

```javascript
contextStorage: {
    pouchdb: {
        module: require("node-red-context-pouchdb"),
        config: {
            // see below options
        }
    }
}
```

## Options

| Options  | Description                                                                   |
| -------- | ----------------------------------------------------------------------------- |
| name     | Specifies the `name` argument for creating the PouchDB databse. You can specify the following.<br>- SQLite : Database storage file path<br>- LevelDB: Database storage folder path<br>- CouchDB: Database URL<br>`default(SQLite): settings.userDir/context/context.db` |
| options  | Specifies the PouchDB database `options`. <br>Example<br>- SQLite : {adapter: 'websql'}<br>- LevelDB: {adapter: 'leveldb'} or {}<br>- CouchDB: {} <br>`default(SQLite): {adapter: 'websql'}`|

Reference: [PouchDB Create a database options](https://pouchdb.com/api.html#create_database)

## Data Model

- This plugin uses a PouchDB database for all context scope.
- The NodeSQLite adapter is added to the PouchDB adapter. You can save the data in SQLite3.
- You can also specify saving to a database (LevelDB, CouchDB) that PouchDB supports as standard.
- This plugin saves a JSON object of keys and values in a document for each scope.
  - The keys of `global context` will be id with `global` .
  - The keys of `flow context` will be id with `<id of the flow>` .
  - The keys of `node context` will be id with `<id of the node>` .
  - Context data is stored in `doc.data` as a document for each scope.

Structure of data stored in PouchDB:
```json
{
    "total_rows": 3,
    "offset": 0,
    "rows": [
        {
            "id": "2052fca8.312154:a77d79a4.d1a908",
            "key": "2052fca8.312154:a77d79a4.d1a908",
            "value": {
                "rev": "6-55e0513ffba64a8b8efec1ba8e43c90f"
            },
            "doc": {
                "data": {
                    "NODE-KEY-1": "NODE-DATA-1",
                    "NODE-KEY-2": "NODE-DATA-2"
                },
                "_id": "2052fca8.312154:a77d79a4.d1a908",
                "_rev": "6-55e0513ffba64a8b8efec1ba8e43c90f"
            }
        },
        {
            "id": "a77d79a4.d1a908",
            "key": "a77d79a4.d1a908",
            "value": {
                "rev": "61-2c2a457388db1c3859b79e4bb62e9375"
            },
            "doc": {
                "data": {
                    "FLOW-KEY-1": "FLOW-DATA-1",
                    "FLOW-KEY-2": "FLOW-DATA-2",
                },
                "_id": "a77d79a4.d1a908",
                "_rev": "61-2c2a457388db1c3859b79e4bb62e9375"
            }
        },
        {
            "id": "global",
            "key": "global",
            "value": {
                "rev": "73-ee260387e51ae20132076ccc83957600"
            },
            "doc": {
                "data": {
                    "GLOBAL-KEY-1": "GLOBAL-DATA-1",
                    "GLOBAL-KEY-2": "GLOBAL-DATA-2",
                },
                "_id": "global",
                "_rev": "73-ee260387e51ae20132076ccc83957600"
            }
        }
    ]
}
```

## Data Structure

- Data is saved in the JSON object format supported by PouchDB. The plugin does not convert JSON data to a string for storage.

Code example that references database data :
```javascript
var pd = require('pouchdb');
pd.plugin(require('pouchdb-adapter-node-websql'));
var db;

db = new pd( "/home/user/.node-red/context/context.db", { adapter: 'websql' });
db.allDocs({include_docs: true}, function(err, doc) {
   if (err) {
        return console.log(err);
   } else {
        var data = JSON.stringify(doc,null,4);
        console.log(data);
   }
});
```

## Database replication

- The data in the context store can be replicated to other DBs using the PouchDB feature.
This allows you to back up the data stored in your local SQLite to a remote CouchDB.This allows you to back up context data stored in your local SQLite to a remote CouchDB.

- In an environment with multiple context stores, only contexts using the PouchDB plugin will be backed up.

Code example of replication to remote database(CouchDB) :
```javascript
var pd = require('pouchdb');
pd.plugin(require('pouchdb-adapter-node-websql'));

var source = "/home/user/.node-red/context/context.db";
var target = "http://localhost:5984/couchdb_mycouchdb_1";

var db_source = new pd(source, { adapter: 'websql' });
var db_target = new pd(target);

db_source.replicate.to(db_target)
.on('complete', function () {
        console.log ("Database replicated.");
}).on('error', function (err) {
        console.log(err);
});
```
Reference: [PouchDB replication](https://pouchdb.com/api.html#replication)

- Replication can also be filtered.You can also consider replicating a partial database (for example, only the global context part).

Code example of replication filtering in global context :
```javascript
db_source.replicate.to(db_target, {
  filter: function (doc) {
    return doc._id === 'global';
}})
```
Reference: [PouchDB filtered replication](https://pouchdb.com/api.html#filtered-replication)

- You can perform replication from the function node.
To execute the flow, you need to add pouchdb require to the functionGlobalContext in setting.js.

Setting example of setting.js:
```javascript
functionGlobalContext {
    pouchdb: require('pouchdb').plugin(require('pouchdb-adapter-node-websql'))
}
```
```javascript
contextStorage: {
    default: "memoryOnly",
    memoryOnly: {
        module: 'memory'
    },
    pouchdb: {
        module: require("node-red-context-pouchdb"),
    }
},
```
The following is a sample flow that replicates the global context of machine A to machine B using remote database.
For operational safety reasons, do not run the context update flow at the same time.

Replicate the global context of Node-RED running on machine A to a remote DB (CouchDB).

Flow example of global context replication to CouchDB:
```json
[{"id":"c054df6e.63e4f","type":"inject","z":"24e3dfb2.5e0d2","name":"","props":[{"p":"payload"},{"p":"topic","vt":"str"}],"repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"","payload":"","payloadType":"date","x":220,"y":220,"wires":[["fb91e7f9.f74868"]]},{"id":"fb91e7f9.f74868","type":"function","z":"24e3dfb2.5e0d2","name":"Global context replication to CouchDB","func":"var pd = global.get(\"pouchdb\");\n\nvar source = \"/home/user/.node-red/context/context.db\";\nvar target = \"http://couchdb-server:5984/couchdb_mycouchdb_1\";\n\nvar db_source = new pd(source, { adapter: 'websql' });\nvar db_target = new pd(target);\n\ndb_source.replicate.to(db_target,{doc_ids: ['global']})\n.on('complete', function () {\n        console.log (\"Database replicated.\");\n}).on('error', function (err) {\n        console.log(err);\n});","outputs":1,"noerr":0,"initialize":"","finalize":"","libs":[],"x":490,"y":220,"wires":[[]]}]
```
Set the source and target in the function node according to the settings of the usage environment.

Replicate the global context saved in the remote DB (CouchDB) to Node-RED running on machine B.

Flow example of global context replication from CouchDB:
```json
[{"id":"e2aa34a6.f1d6f8","type":"inject","z":"d2880c73.3f51f","name":"","props":[{"p":"payload"},{"p":"topic","vt":"str"}],"repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"","payload":"","payloadType":"date","x":180,"y":100,"wires":[["bbc87d2e.47404"]]},{"id":"bbc87d2e.47404","type":"function","z":"d2880c73.3f51f","name":"Global context replication from CouchDB","func":"var pd = global.get(\"pouchdb\");\n\nvar source = \"http://couchdb-server:5984/couchdb_mycouchdb_1\";\nvar target = \"/home/user/.node-red/context/context.db\";\n\nvar db_source = new pd(source);\nvar db_target = new pd(target,{adapter: 'websql'});\n\ndb_target.replicate.from(db_source,{doc_ids: ['global']})\n.on('complete', function () {\n        console.log (\"Database replicated.\");\n}).on('error', function (err) {\n        console.log(err);\n});","outputs":1,"noerr":0,"initialize":"","finalize":"","libs":[],"x":460,"y":100,"wires":[[]]}]
```
Set the source and target in the function node according to the settings of the usage environment.