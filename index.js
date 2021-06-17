/**
 * Copyright JS Foundation and other contributors, http://js.foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/
/**
 * PouchDB context storage
 *
 * Configuration options:
 * {
 *    name: "/path/to/storage/context.db"  // Specifies the name argument for creating the PouchDB databse.
 *                                         // You can specify the following.
 *                                         //  SQLite : Database storage file path
 *                                         //  LevelDB: Database storage folder path
 *                                         //  CouchDB: Database URL
 *                                         //  default(SQLite): settings.userDir/context.db
 *    options: {adapter: 'websql'},        // Specifies the PouchDB database options
 *                                         //  Example
 *                                         //  SQLite : {adapter: 'websql'}
 *                                         //  LevelDB: {adapter: 'leveldb'} or {}
 *                                         //  CouchDB: {}
 *                                         //  default: {adapter: 'websql'}
 *                                         // PouchDB options detail: 
 *                                         //  https://pouchdb.com/api.html#create_database
 * }
 *
 * $HOME/.node-red/context/context.db 
 */

// Require @node-red/util loaded in the Node-RED runtime.
var util = process.env.NODE_RED_HOME ?
    require(require.resolve('@node-red/util', { paths: [process.env.NODE_RED_HOME] })).util :
    require('@node-red/util').util;
var log = process.env.NODE_RED_HOME ?
    require(require.resolve('@node-red/util', { paths: [process.env.NODE_RED_HOME] })).log :
    require('@node-red/util').log;

var fs = require('fs-extra');
var path = require("path");
var pd = require('pouchdb');
pd.plugin(require('pouchdb-adapter-node-websql'));
pd.plugin(require('pouchdb-upsert'));
var db;

function getDbDir(config) {
    var dbDir;
    if (!config.name) {
        if(config.settings && config.settings.userDir){
            dbDir = path.join(config.settings.userDir, "context");
        }else{
            try {
                fs.statSync(path.join(process.env.NODE_RED_HOME,".config.json"));
                dbDir = path.join(process.env.NODE_RED_HOME, "context");
            } catch(err) {
                try {
                    // Consider compatibility for older versions
                    if (process.env.HOMEPATH) {
                        fs.statSync(path.join(process.env.HOMEPATH,".node-red",".config.json"));
                        dbDir = path.join(process.env.HOMEPATH, ".node-red", "context");
                    }
                } catch(err) {
                }
                if (!dbDir) {
                    dbDir = path.join(process.env.HOME || process.env.USERPROFILE || process.env.HOMEPATH || process.env.NODE_RED_HOME,".node-red", "context");
                }
            }
        }
    } else {
        dbDir = path.dirname(config.name);
    }
    return dbDir;
}

function getDbOptions(config) {
    var dbOptions;
    if (config.options) {
        dbOptions = config.options;
    } else {
        dbOptions = { adapter: 'websql' };
    }
    return dbOptions;
}

function getDbBase(config) {
    var dbBase;
    if (config.name) {
        dbBase = path.basename(config.name);
    } else {
        dbBase = "context.db";
    }
    return dbBase;
}

function getDbURL(config) {
    var dbURL;
    if (config.name && (config.name.startsWith("http://") || config.name.startsWith("https://"))) {
        dbURL = config.name;
    } else {
        dbURL = null;
    }
    return dbURL;
}

function updateDocData(doc, key, value) {
    for (var i=0; i<key.length; i++) {
        var v = null;
        if (i < value.length) {
          v = value[i];
        }
        util.setObjectProperty(doc.data, key[i], v);
    }
    return doc;
}

function PouchDB(config) {
    this.config = config;
    this.dbURL = getDbURL(this.config);
    if (!this.dbURL) {
        this.dbDir = getDbDir(this.config);
        this.dbBase = getDbBase(this.config);
    } else {
        this.dbDir = null;
        this.dbBase = null;
    }
    this.dbOptions = getDbOptions(this.config);
}

PouchDB.prototype.open = function () {
    if (this.dbDir) {
        if (!fs.existsSync(this.dbDir)) {
            fs.ensureDirSync(this.dbDir);
        }
    }
    var dbName;
    if (this.dbURL) {
        dbName = this.dbURL;
    } else {
        dbName = path.join(this.dbDir, this.dbBase);
    }
    db = new pd(dbName, this.dbOptions);
    return Promise.resolve();
};

PouchDB.prototype.close = function () {
    db.close();
    return Promise.resolve();
};

PouchDB.prototype.get = function (scope, key, callback) {
    if(typeof callback !== "function"){
        throw new Error("Callback must be a function");
    }
    db.get(scope).then(function (doc) {
        if (doc.data) {
            var data = doc.data;
            var value;
            if (!Array.isArray(key)) {
                try {
                    value = util.getObjectProperty(data, key);
                } catch(err) {
                    if (err.code === "INVALID_EXPR") {
                        throw err;
                    }
                    value = undefined;
                }
                callback(null, value);
            } else {
                var results = [undefined];
                for (var i = 0; i < key.length; i++) {
                    try {
                        value = util.getObjectProperty(data, key[i]);
                    } catch(err) {
                        if (err.code === "INVALID_EXPR") {
                            throw err;
                        }
                        value = undefined;
                    }
                    results.push(value);
                }
                callback.apply(null, results);
            }
        } else {
            callback(null, undefined);     
        }
    }).catch(function (err) {
        if (err.status === 404) {
            callback(null, undefined);
        } else {
            callback(err);
        }
    }); 
};

PouchDB.prototype.set = function (scope, key, value, callback) {
    if (callback && typeof callback !== 'function') {
        throw new Error("Callback must be a function");
    }
    if (!Array.isArray(key)) {
        key = [key];
        value = [value];
    } else if (!Array.isArray(value)) {
        value = [value];
    }
    db.get(scope).then(function (doc) {
        db.upsert( scope, function(doc){
            try {
                doc = updateDocData(doc, key, value);
                return doc;
            } catch (err) {
                if(typeof callback === "function"){
                    callback(err);
                }
            }
        }).then(function (res) {
            if(typeof callback === "function"){
                callback(null);
            }
        }).catch(function (err) {
            if(typeof callback === "function"){
                callback(err);
            }
        });
    }).catch(function (err) {
        // Context data does not exist
        if (err.status === 404) {
            var doc = { data: {} };
            try {
                doc = updateDocData(doc, key, value);
            } catch (err) {
                if(typeof callback === "function"){
                    callback(err);
                }
                return;
            }
            db.put({ _id: scope, data: doc.data}).then(function (res){
                if(typeof callback === "function"){
                    callback(null);
                }
            }).catch(function (err){
                //  Context data update conflict
                if (err.status === 409) {
                    var doc = { data: {} };
                    db.upsert( scope, function( doc){
                        try {
                            doc = updateDocData( doc, key, value);
                            return doc;
                        } catch (err) {
                            if(typeof callback === "function"){
                                callback(err);
                            }
                            return;
                        }
                    }).then(function (res) {
                        if(typeof callback === "function"){
                            callback(null);
                        }
                    }).catch(function (err) {
                        if(typeof callback === "function"){
                            callback(err);
                        }
                    });
                } else {
                    if(typeof callback === "function"){
                       callback(err);
                    }
                }
            });
        } else {
            if(typeof callback === "function"){
                callback(err);
            }
        }
    });
};

PouchDB.prototype.keys = function (scope, callback) {
    if(typeof callback !== "function"){
        throw new Error("Callback must be a function");
    }
    db.get(scope).then(function (doc) {
        if(doc.data){
            callback(null, Object.keys(doc.data));
        } else {
            callback(null, []);
        }
    }).catch(function (err) {
        if (err.status === 404) {
            callback(null, []);
        } else {
            callback(err);
        }
    });
};

PouchDB.prototype.delete = function (scope) {
    return new Promise((resolve, reject) => {
        db.get(scope).then(function (doc) {
            db.remove(scope, doc._rev).then(function (res) {
                resolve();
            }).catch(function (err){
                // Failed to delete context data
                reject(err);
            });
        }).catch(function (err) {
            if (err.status === 404) {
                resolve();
            } else {
                reject(err);
            }
        });
    });
};

PouchDB.prototype.clean = function (_activeNodes) {
    return new Promise((resolve, reject) => {
        db.allDocs({include_docs: true}).then(function(docs) {
            var res = docs.rows;
            res = res.filter(doc => !doc.id.startsWith("global"))
            _activeNodes.forEach(key => {
                res = res.filter(doc => !doc.id.startsWith(key))
            });
            var promises = [];
            res.forEach(function(doc) {
                var removePromise = db.get(doc.id).then(function(data) {
                    db.remove(doc.id, data._rev).then(function(res) {
                        resolve();
                    }).catch(function (err) {
                        if (err.status === 409) {
                            // Already deleted. conflict status= 409
                            resolve();
                        } else {
                            reject(err);
                        }
                    });
                }).catch(function (err) {
                    // Failed to get context data
                    reject(err);
                });
                if(removePromise) {
                    promises.push(removePromise);
                }
            });
            if (promises.length != 0) { 
                return Promise.all(promises);
            } else {
                resolve();
            } 
        }).catch(function (err) {
            // Failed to get all context data
            reject(err);
        });
    });
}

module.exports = function (config) {
    return new PouchDB(config);
};
