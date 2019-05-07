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
        }
        return this;
    }

    finally(callback) {
        this._finallys.push(callback);
        if (this._state !== MyPromise.PENDING) {
            this._handle(this._prevValue);
        }
        return this;
    }

    _handle(args) {
        if (this._state === MyPromise.PENDING) return this;
        let hitName;
        switch (this._state) {
            case MyPromise.COMPLETE:
                hitName = '_resolves';
                break;
            case MyPromise.FAILING:
                hitName = '_rejects';
                break;
        }
        let fn, value;

        while (fn = this[hitName].shift()) {
            value = fn.call(this, value || args);
        }

        while (fn = this._finallys.shift()) {
            value = fn.call(this, value || args);
        }
        this._prevValue = value || args;
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
    return new MyPromise((resolve, reject) => {
        let values = [];
        for (let i = 0; i < iterable.length; i++) {
            if (iterable[i] instanceof MyPromise) {
                (key => {
                    iterable[key].finally(result => {
                        values[key] = result;
                        if (values.length === iterable.length) {
                            if (iterable[key].getState() === MyPromise.COMPLETE) {
                                resolve(values);
                            } else {
                                reject(values);
                            }
                        }
                    })
                })(i)
            } else if (typeof iterable[i] === 'function') {
                const isCmplete = values.length === iterable.length;
                try {
                    values[i] = iterable[i]();
                    if (isCmplete) {
                        resolve(values);
                    }
                } catch (err) {
                    reject(err);
                }
            } else {
                values[i] = iterable[i];
                if (values.length === iterable.length) {
                    resolve(values);
                }
            }
        }
    })
}

MyPromise.race = function(iterable) {
    return new MyPromise((resolve, reject) => {
        let flag = false;
        for (let i = 0; i < iterable.length; i++) {
            if (flag) {
                break;
            }
            if (iterable[i] instanceof MyPromise) {
                iterable[i].finally((result) => {
                    flag = true;
                    if (iterable[i].getState() === MyPromise.COMPLETE) {
                        resolve(result);
                    } else {
                        reject(result);
                    }
                })
            } else if (typeof iterable[i] === 'function') {
                try {
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
