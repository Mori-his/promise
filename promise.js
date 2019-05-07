class MyPromise {
    constructor(input) {
        this._resolves = [];
        this._rejects = [];
        this._finallys = [];
        this._state = MyPromise.PENDING;
        input(MyPromise.resolve.bind(this), MyPromise.reject.bind(this));
    }

    then(callback) {
        this._resolves.push(callback);
        if (this._state === MyPromise.COMPLETE) {
            this._handle(this._prevValue);
        }
        return this;
    }

    catch(callback) {
        this._rejects.push(callback);
        if (this._state === MyPromise.FAILING) {
            this._handle(this._prevValue);
    _handle(args) {
        if (this._state === MyPromise.PENDING) return this;
        let hitName = this._state === MyPromise.COMPLETE ? '_resolves' : '_rejects';
        let fn, value;
        while(fn = this[hitName].shift()) {
            value = fn.call(this, value || args);
        }
        while(fn = this._finallys.shift()) {
            value = fn.call(this, value || args);
        }
        this._prevValue = args;
    }
    then(callback) {
        this._resolves.push(callback);
        if (this._state === MyPromise.COMPLETE) this._handle(this._prevValue);

        return this;
    }
    catch(callback) {
        this._rejects.push(callback);
        if (this._state === MyPromise.FAILING) this._handle(this._prevValue);

        return this;
    }
    finally(callback) {
        this._finallys.push(callback);
        if (this._state !== MyPromise.PENDING) this._handle(this._prevValue);

        return this;
    }
    getState() {
        return this._state;
    }

}
MyPromise.PENDING = "PENDING";
MyPromise.COMPLETE = "COMPLETE";
MyPromise.FAILING = "FAILING";

MyPromise.resolve = function(args) {
    if (!(this instanceof MyPromise)) {
        return new MyPromise(resolve => {
            resolve(args);
        });
    }
    this._state = MyPromise.COMPLETE
    this._handle(args);
    return this;
}
MyPromise.reject = function(args) {
    if (!(this instanceof MyPromise)) {
        return new MyPromise((resolve, reject) => {
            reject(args);
        });
    }
    this._state = MyPromise.FAILING;
    this._handle(args);
    return this;
}

MyPromise.all = function(iterable) {
    if (!(iterable instanceof Array)) return;
    let result = [], hasPromise, promiseNum = 0;
    return new MyPromise((resolve, reject) => {
        for (let i = 0; i < iterable.length; i++) {
            if (iterable[i] instanceof MyPromise) {
                hasPromise = true;
                ++promiseNum;
                ((key) => {
                    iterable[i].then(data => {
                        --promiseNum;
                        result[key] = data;
                        if (promiseNum === 0 && result.length === iterable.length) {
                            resolve(result);
                        } else if (promiseNum === 0) {
                            hasPromise = false;
                        }
                    }).catch(err => {
                        reject(err);
                    });
                })(i);
            } else if (typeof iterable[i] === 'function') {
                result[i] = iterable[i]();
            } else {
                result[i] = iterable[i]
            }
        }
        if (!hasPromise) {
            resolve(result)
        }

    });
}

MyPromise.race = function(iterable) {
    return new MyPromise((resolve, reject) => {
        let flag = false;
        for (let i = 0; i < iterable.length; i++) {
            if (flag) break;
            if (iterable[i] instanceof MyPromise) {
                iterable[i].finally((result) => {
                    if (flag) return;
                    flag = true;
                    if (iterable[i].getState() === MyPromise.COMPLETE) {
                        resolve(result);
                    } else {
                        reject(result);
                    }
                })
            } else if (typeof iterable[i] === 'function') {
                try {
                    flag = true;
                    resolve(iterable[i]());
                } catch (e) {
                    reject(e);
                }
            } else {
                resolve(iterable);
            }
        }
    });
}
