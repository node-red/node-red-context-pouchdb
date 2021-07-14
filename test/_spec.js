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

var should = require('should');
const pouchdbPlugin = require('../index.js');

describe('pouchdb', function () {
    before(function () {
        const self = this;
        const context = pouchdbPlugin({});
        return context.open().then(function(){
            return context.close();
        }).catch(() => {
            console.log('Can not connect to  pouchdb, All tests will be skipped!');
            self.test.parent.pending = true;
            self.skip();
        });
    });

    describe('#open', function () {
        it('should load configs sqlite', function () {
            const context1 = pouchdbPlugin({ name: "/tmp/pouchdb/context.db" });
            return context1.open().then(function () {
                context1.should.have.properties(
                    { config: { name: '/tmp/pouchdb/context.db' },
                      dbURL: null,
                      dbDir: '/tmp/pouchdb',
                      dbBase: 'context.db',
                      dbOptions: { adapter: 'websql', deterministic_revs: true }
                    });
                return context1.close();
            });
        });

        it('should load configs leveldb', function () {
            const context2 = pouchdbPlugin({ name: "/tmp/leveldb/db", options: { adapter: 'leveldb' }});
            return context2.open().then(function () {
                context2.should.have.properties(
                    { config: { name: '/tmp/leveldb/db', options: { adapter: 'leveldb', deterministic_revs: true}},
                      dbURL: null,
                      dbDir: '/tmp/leveldb',
                      dbBase: 'db',
                      dbOptions: { adapter: 'leveldb', deterministic_revs: true }
                    });
                return context2.close();
            });
        });

        it('should load configs couchdb', function () {
            const context3 = pouchdbPlugin({ name: "http://localhost:5984/couchdb_mycouchdb_1", options: {}});
            return context3.open().then(function () {
                context3.should.have.properties(
                    { config: { name: 'http://localhost:5984/couchdb_mycouchdb_1', options: {deterministic_revs: true}},
                      dbURL: 'http://localhost:5984/couchdb_mycouchdb_1',
                      dbDir: null,
                      dbBase: null,
                      dbOptions: {deterministic_revs: true}
                    });
                return context3.close();
            });
        });
    });

    describe('#get/set', function () {
        const context = pouchdbPlugin({});

        beforeEach(function () {
            return context.open();
        });
        afterEach(function () {
            return context.clean([]).then(function(){
            	return context.close();
            });
        });

        it('should store property',function(done) {
            context.get("nodeX","foo",function(err, value){
                if (err) { return done(err); }
                should.not.exist(value);
                context.set("nodeX","foo","test",function(err){
                    if (err) { return done(err); }
                    context.get("nodeX","foo",function(err, value){
                        if (err) { return done(err); }
                        value.should.be.equal("test");
                        done();
                    });
                });
            });
        });

        it('should store property - creates parent properties',function(done) {
            context.set("nodeX","foo.bar","test",function(err){
                context.get("nodeX","foo",function(err, value){
                    value.should.be.eql({bar:"test"});
                    done();
                });
            });
        });

        it('should store local scope property', function (done) {
            context.set("abc:def", "foo.bar", "test", function (err) {
                context.get("abc:def", "foo", function (err, value) {
                    value.should.be.eql({ bar: "test" });
                    done();
                });
            });
        });

        it('should delete property',function(done) {
            context.set("nodeX","foo.abc.bar1","test1",function(err){
                context.set("nodeX","foo.abc.bar2","test2",function(err){
                    context.get("nodeX","foo.abc",function(err, value){
                        value.should.be.eql({bar1:"test1",bar2:"test2"});
                        context.set("nodeX","foo.abc.bar1",undefined,function(err){
                            context.get("nodeX","foo.abc",function(err, value){
                                value.should.be.eql({bar2:"test2"});
                                context.set("nodeX","foo.abc",undefined,function(err){
                                    context.get("nodeX","foo.abc",function(err, value){
                                        should.not.exist(value);
                                        context.set("nodeX","foo",undefined,function(err){
                                            context.get("nodeX","foo",function(err, value){
                                                should.not.exist(value);
                                                done();
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });

        it('should not shared context with other scope', function(done) {
            context.get("nodeX","foo",function(err, value){
                should.not.exist(value);
                context.get("nodeY","foo",function(err, value){
                    should.not.exist(value);
                    context.set("nodeX","foo","testX",function(err){
                        context.set("nodeY","foo","testY",function(err){
                            context.get("nodeX","foo",function(err, value){
                                value.should.be.equal("testX");
                                context.get("nodeY","foo",function(err, value){
                                    value.should.be.equal("testY");
                                    done();
                                });
                            });
                        });
                    });
                });
            });
        });

        it('should store string',function(done) {
            context.get("nodeX","foo",function(err, value){
                should.not.exist(value);
                context.set("nodeX","foo","bar",function(err){
                    context.get("nodeX","foo",function(err, value){
                        value.should.be.String();
                        value.should.be.equal("bar");
                        context.set("nodeX","foo","1",function(err){
                            context.get("nodeX","foo",function(err, value){
                                value.should.be.String();
                                value.should.be.equal("1");
                                done();
                            });
                        });
                    });
                });
            });
        });

        it('should store number',function(done) {
            context.get("nodeX","foo",function(err, value){
                should.not.exist(value);
                context.set("nodeX","foo",1,function(err){
                    context.get("nodeX","foo",function(err, value){
                        value.should.be.Number();
                        value.should.be.equal(1);
                        done();
                    });
                });
            });
        });

        it('should store null',function(done) {
            context.get("nodeX","foo",function(err, value){
                should.not.exist(value);
                context.set("nodeX","foo",null,function(err){
                    context.get("nodeX","foo",function(err, value){
                        should(value).be.null();
                        done();
                    });
                });
            });
        });

        it('should store boolean',function(done) {
            context.get("nodeX","foo",function(err, value){
                should.not.exist(value);
                context.set("nodeX","foo",true,function(err){
                    context.get("nodeX","foo",function(err, value){
                        value.should.be.Boolean().and.true();
                        context.set("nodeX","foo",false,function(err){
                            context.get("nodeX","foo",function(err, value){
                                value.should.be.Boolean().and.false();
                                done();
                            });
                        });
                    });
                });
            });
        });

        it('should store object',function(done) {
            context.get("nodeX","foo",function(err, value){
                should.not.exist(value);
                context.set("nodeX","foo",{obj:"bar"},function(err){
                    context.get("nodeX","foo",function(err, value){
                        value.should.be.Object();
                        value.should.eql({obj:"bar"});
                        done();
                    });
                });
            });
        });

        it('should store array',function(done) {
            context.get("nodeX","foo",function(err, value){
                should.not.exist(value);
                context.set("nodeX","foo",["a","b","c"],function(err){
                    context.get("nodeX","foo",function(err, value){
                        value.should.be.Array();
                        value.should.eql(["a","b","c"]);
                        context.get("nodeX","foo[1]",function(err, value){
                            value.should.be.String();
                            value.should.equal("b");
                            done();
                        });
                    });
                });
            });
        });

        it('should store array of arrays',function(done) {
            context.get("nodeX","foo",function(err, value){
                should.not.exist(value);
                context.set("nodeX","foo",[["a","b","c"],[1,2,3,4],[true,false]],function(err){
                    context.get("nodeX","foo",function(err, value){
                        value.should.be.Array();
                        value.should.have.length(3);
                        value[0].should.have.length(3);
                        value[1].should.have.length(4);
                        value[2].should.have.length(2);
                        context.get("nodeX","foo[1]",function(err, value){
                            value.should.be.Array();
                            value.should.have.length(4);
                            value.should.be.eql([1,2,3,4]);
                            done();
                        });
                    });
                });
            });
        });

        it('should store array of objects',function(done) {
            context.get("nodeX","foo",function(err, value){
                should.not.exist(value);
                context.set("nodeX","foo",[{obj:"bar1"},{obj:"bar2"},{obj:"bar3"}],function(err){
                    context.get("nodeX","foo",function(err, value){
                        value.should.be.Array();
                        value.should.have.length(3);
                        value[0].should.be.Object();
                        value[1].should.be.Object();
                        value[2].should.be.Object();
                        context.get("nodeX","foo[1]",function(err, value){
                            value.should.be.Object();
                            value.should.be.eql({obj:"bar2"});
                            done();
                        });
                    });
                });
            });
        });

        it('should set/get multiple values', function(done) {
            context.set("nodeX",["one","two","three"],["test1","test2","test3"], function(err) {
                context.get("nodeX",["one","two"], function() {
                    Array.prototype.slice.apply(arguments).should.eql([undefined,"test1","test2"])
                    done();
                });
            });
        })
        it('should set/get multiple values - get unknown', function(done) {
            context.set("nodeX",["one","two","three"],["test1","test2","test3"], function(err) {
                context.get("nodeX",["one","two","unknown"], function() {
                    Array.prototype.slice.apply(arguments).should.eql([undefined,"test1","test2",undefined])
                    done();
                });
            });
        })
        it('should set/get multiple values - single value providd', function(done) {
            context.set("nodeX",["one","two","three"],"test1", function(err) {
                context.get("nodeX",["one","two"], function() {
                    Array.prototype.slice.apply(arguments).should.eql([undefined,"test1",null])
                    done();
                });
            });
        })

        it('should throw error if bad key included in multiple keys - get', function(done) {
            context.set("nodeX",["one","two","three"],["test1","test2","test3"], function(err) {
                context.get("nodeX",["one",".foo","three"], function(err) {
                    should.exist(err);
                    done();
                });
            });
        })

        it('should throw error if bad key included in multiple keys - set', function(done) {
            context.set("nodeX",["one",".foo","three"],["test1","test2","test3"], function(err) {
                should.exist(err);
                // Check 'one' didn't get set as a result
                context.get("nodeX","one",function(err,one) {
                    should.not.exist(one);
                    done();
                })
            });
        })

        it('should throw an error when getting a value with invalid key', function (done) {
            context.set("nodeX","foo","bar",function(err) {
                context.get("nodeX"," ",function(err,value) {
                    should.exist(err);
                    done();
                });
            });
        });

        it('should throw an error when setting a value with invalid key',function (done) {
            context.set("nodeX"," ","bar",function (err) {
                should.exist(err);
                done();
            });
        });

        it('should throw an error when callback of get() is not a function',function (done) {
            try {
                context.get("nodeX","foo","callback");
                done("should throw an error.");
            } catch (err) {
                done();
            }
        });

        it('should throw an error when callback of get() is not specified',function (done) {
            try {
                context.get("nodeX","foo");
                done("should throw an error.");
            } catch (err) {
                done();
            }
        });

        it('should throw an error when callback of set() is not a function',function (done) {
            try {
                context.set("nodeX","foo","bar","callback");
                done("should throw an error.");
            } catch (err) {
                done();
            }
        });

        it('should not throw an error when callback of set() is not specified', function (done) {
            try {
                context.set("nodeX"," ","bar");
                done();
            } catch (err) {
                done("should not throw an error.");
            }
        });

    });

    describe('#keys', function () {
        const context = pouchdbPlugin({});

        beforeEach(function () {
            return context.open();
        });
        afterEach(function () {
            return context.clean([]).then(function(){
                return context.close();
            });
        });

        it('should enumerate context keys', function(done) {
            context.keys("nodeX",function(err, value){
                value.should.be.an.Array();
                value.should.be.empty();
                context.set("nodeX","foo","bar",function(err){
                    context.keys("nodeX",function(err, value){
                        value.should.have.length(1);
                        value[0].should.equal("foo");
                        context.set("nodeX","abc.def","bar",function(err){
                            context.keys("nodeX",function(err, value){
                                value.should.have.length(2);
                                value[1].should.equal("abc");
                                done();
                            });
                        });
                    });
                });
            });
        });

        it('should enumerate context keys in each scopes', function(done) {
            context.keys("nodeX",function(err, value){
                value.should.be.an.Array();
                value.should.be.empty();
                context.keys("nodeY",function(err, value){
                    value.should.be.an.Array();
                    value.should.be.empty();
                    context.set("nodeX","foo","bar",function(err){
                        context.set("nodeY","hoge","piyo",function(err){
                            context.keys("nodeX",function(err, value){
                                value.should.have.length(1);
                                value[0].should.equal("foo");
                                context.keys("nodeY",function(err, value){
                                    value.should.have.length(1);
                                    value[0].should.equal("hoge");
                                    done();
                                });
                            });
                        });
                    });
                });
            });
        });

        it('should throw an error when callback of keys() is not a function', function (done) {
            try {
                context.keys("nodeX", "callback");
                done("should throw an error.");
            } catch (err) {
                done();
            }
        });

        it('should throw an error when callback of keys() is not specified', function (done) {
            try {
                context.keys("nodeX");
                done("should throw an error.");
            } catch (err) {
                done();
            }
        });
    });

    describe('#delete', function () {
        const context = pouchdbPlugin({});

        beforeEach(function () {
            return context.open();
        });
        afterEach(function () {
            return context.clean([]).then(function(){
            	return context.close();
            });
        });

        it('should delete context',function(done) {
            context.get("nodeX","foo",function(err, value){
                should.not.exist(value);
                context.get("nodeY","foo",function(err, value){
                    should.not.exist(value);
                    context.set("nodeX","foo","testX",function(err){
                        context.set("nodeY","foo","testY",function(err){
                            context.get("nodeX","foo",function(err, value){
                                value.should.be.equal("testX");
                                context.get("nodeY","foo",function(err, value){
                                    value.should.be.equal("testY");
                                    context.delete("nodeX").then(function(){
                                        context.get("nodeX","foo",function(err, value){
                                            should.not.exist(value);
                                            context.get("nodeY","foo",function(err, value){
                                                value.should.be.equal("testY");
                                                done();
                                            });
                                        });
                                    }).catch(done);
                                });
                            });
                        });
                    });
                });
            });
        });
    });

    describe('#clean', function () {
        const context = pouchdbPlugin({});
        function pouchdbGet(scope, key) {
            return new Promise((res, rej) => {
                context.get(scope, key, function (err, value) {
                    if (err) {
                        rej(err);
                    } else {
                        res(value);
                    }
                });
            });
        }
        function pouchdbSet(scope, key, value) {
            return new Promise((res, rej) => {
                context.set(scope, key, value, function (err) {
                    if (err) {
                        rej(err);
                    } else {
                        res();
                    }
                });
            });
        }
        beforeEach(function () {
            return context.open();
        });
        afterEach(function () {
            return context.clean([]).then(function(){
            	return context.close();
            });
        });

        it('should not clean active context', function () {
            return pouchdbSet("global", "foo", "testGlobal").then(function () {
                return pouchdbSet("nodeX:flow1", "foo", "testX");
            }).then(function () {
                return pouchdbSet("nodeY:flow2", "foo", "testY");
            }).then(function () {
                return pouchdbGet("nodeX:flow1", "foo").should.be.fulfilledWith("testX");
            }).then(function () {
                return pouchdbGet("nodeY:flow2", "foo").should.be.fulfilledWith("testY");
            }).then(function () {
                return context.clean(["nodeX:flow1"]);
            }).then(function () {
                return pouchdbGet("nodeX:flow1", "foo").should.be.fulfilledWith("testX");
            }).then(function () {
                return pouchdbGet("nodeY:flow2", "foo").should.be.fulfilledWith(undefined);
            }).then(function () {
                return pouchdbGet("global", "foo").should.be.fulfilledWith("testGlobal");
            });
        });


        it('should clean unnecessary context', function () {
            return pouchdbSet("global", "foo", "testGlobal").then(function () {
                return pouchdbSet("nodeX:flow1", "foo", "testX");
            }).then(function () {
                return pouchdbSet("nodeY:flow2", "foo", "testY");
            }).then(function () {
                return pouchdbGet("nodeX:flow1", "foo").should.be.fulfilledWith("testX");
            }).then(function () {
                return pouchdbGet("nodeY:flow2", "foo").should.be.fulfilledWith("testY");
            }).then(function () {
                return context.clean([]);
            }).then(function () {
                return pouchdbGet("nodeX:flow1", "foo").should.be.fulfilledWith(undefined);
            }).then(function () {
                return pouchdbGet("nodeY:flow2", "foo").should.be.fulfilledWith(undefined);
            }).then(function () {
                return pouchdbGet("global", "foo").should.be.fulfilledWith("testGlobal");
            });
        });

    });
});
