// Promises/A+: https://promisesaplus.com/
class MyPromise {
    // A promise must be in one of three states: pending, fulfilled, or rejected.     
    static PENDING = 'pending'
    static FULFILLED = 'fulfilled'
    static REJECTED = 'rejected'

    constructor(executor) {
        this._state = MyPromise.PENDING
        this._result = null
        this._onFulfilledCallbacks = []
        this._onRejectedCallbacks = []
        try {
            executor(this._resolve.bind(this), this._reject.bind(this))
        } catch (error) {
            this.reject(error)
        }
    }

    _resolve(result) {
        // 2.2.1 When pending, a promise: may transition to either the fulfilled or rejected state. “must not change” means immutable identity (i.e. ===), but does not imply deep immutability.
        if (this._state === MyPromise.PENDING) {
            // onFulfilled or onRejected must not be called until the execution context stack contains only platform code.
            setTimeout(() => {
                this._state = MyPromise.FULFILLED
                this._result = result
                this._onFulfilledCallbacks.forEach(callback => {
                    callback(result)
                })
            });
        }
    }

    _reject(reason) {
        if (this._state === MyPromise.PENDING) {
            setTimeout(() => {
                this._state = MyPromise.REJECTED
                this._result = reason
                this._onRejectedCallbacks.forEach(callback => {
                    callback(reason)
                })
            });
        }
    }
    // A promise’s then method accepts two arguments, Both onFulfilled and onRejected are optional arguments
    then(onFulfilled, onRejected) {
        /** 
            * 2.2.2 If onFulfilled is a function:
            * 2.2.2.1 it must be called after promise is fulfilled, with promise’s value as its first argument.
            * 2.2.2.2 it must not be called before promise is fulfilled.
            * 2.2.2.3 it must not be called more than once.
        */
        onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : result => result
        /** 
            * 2.2.3 If onRejected is a function:
            * 2.2.3.1 it must be called after promise is rejected, with promise’s reason as its first argument.
            * 2.2.3.2 it must not be called before promise is rejected.
            * 2.2.3.3 it must not be called more than once.
        */
        onRejected = typeof onRejected === 'function' ? onRejected : reason => {
            throw reason
        }

        let promise2 = new MyPromise((resolve, reject) => {
            if (this._state === MyPromise.PENDING) {
                this._onFulfilledCallbacks.push(() => {
                    try {
                        let x = onFulfilled(this._result)
                        resolvePromise(promise2, x, resolve, reject)
                    } catch (error) {
                        reject(error)
                    }
                })
                this._onRejectedCallbacks.push(() => {
                    try {
                        let x = onRejected(this._result)
                        resolvePromise(promise2, x, resolve, reject)
                    } catch (error) {
                        reject(error)
                    }
                })
            } else if (this._state === MyPromise.FULFILLED) {
                // 2.2.4 onFulfilled or onRejected must not be called until the execution context stack contains only platform code.
                setTimeout(() => {
                    try {
                        let x = onFulfilled(this._result)
                        // 2.2.7.1 If either onFulfilled or onRejected returns a value x, run the Promise Resolution Procedure
                        resolvePromise(promise2, x, resolve, reject)
                    } catch (error) {
                        // 2.2.7.2 If either onFulfilled or onRejected throws an exception e, promise2 must be rejected with e as the reason.
                        reject(error)
                    }
                })
            } else if (this._state === MyPromise.REJECTED) {
                // 2.2.4 onFulfilled or onRejected must not be called until the execution context stack contains only platform code.
                setTimeout(() => {
                    try {
                        let x = onRejected(this._result)
                        // 2.2.7.1 If either onFulfilled or onRejected returns a value x, run the Promise Resolution Procedure
                        resolvePromise(promise2, x, resolve, reject)
                    } catch (error) {
                        reject(error)
                    }
                })
            }
        })

        // 2.2.7 then must return a promise
        return promise2
    }

    catch (onRejected) {
        return this.then(null, onRejected)
    }

    finally(callback) {
        return this.then(callback, callback)
    }

    static resolve(value) {
        if (value instanceof MyPromise) {
            return value
        }
        else if (value instanceof Object && 'then' in value) {
            return new MyPromise((resolve, reject) => {
                value.then(resolve, reject)
            })
        }
        return new MyPromise(resolve => resolve(value))
    }

    static reject(reason) {
        return new MyPromise((_, reject) => reject(reason))
    }

    static all(promises) {
        return new MyPromise((resolve, reject) => {
            if (Array.isArray(promises)) {
                let result = []
                let count = 0
                if(promises.length === 0) {
                    return resolve(promises)
                }
                promises.forEach((p, index) => {
                    MyPromise.resolve(p).then(
                        value => {
                            count ++
                            result[index] = value
                            count === promises.length && resolve(result)
                        },
                        reason => {
                            reject(reason)
                        }
                    )
                })
            } 
            else {
                return reject(new Error('Argument is not iterable'))
            }
        })
    }

    static race() {

    }

    static allSettled() {

    }

    static any() {

    }

    // 提案
    try () {

    }
}

// https://promisesaplus.com/#the-promise-resolution-procedure
function resolvePromise(promise2, x, resolve, reject) {
    // 2.3.1 If promise and x refer to the same object, reject promise with a TypeError as the reason.
    if (x === promise2) {
        return reject(new TypeError('Chaining cycle detected for promise'))
    }

    // 2.3.2 If x is a promise, adopt its state
    if (x instanceof MyPromise) {
        if (x._state === MyPromise.PENDING) {
            // 2.3.2.1 If x is pending, promise must remain pending until x is fulfilled or rejected.
            x.then(
                y => resolvePromise(promise2, y, resolve, reject),
                reject
            )
        } else if (x._state === MyPromise.FULFILLED) {
            // 2.3.2.2 If/when x is fulfilled, fulfill promise with the same value.
            resolve(x._result)
        } else if (x._state === MyPromise.REJECTED) {
            // 2.3.2.3 If/when x is rejected, reject promise with the same reason.
            reject(x._result)
        }
    } else if (x !== null && (typeof x === 'object' || typeof x === 'function')) {
        // 2.3.3 Otherwise, if x is an object or function,
        try {
            // 2.3.3.1 Let then be x.then
            let then = x.then
            // 2.3.3.4 If then is not a function, fulfill promise with x.
            if (typeof then !== 'function') {
                resolve(x)
            } else {
                // 2.3.3.3.3 If both resolvePromise and rejectPromise are called, or multiple calls to the same argument are made, the first call takes precedence, and any further calls are ignored.
                let called = false;
                try {
                    then.call(
                        x,
                        // 2.3.3.3.1 If/when resolvePromise is called with a value y, run [[Resolve]](promise, y).
                        y => {
                            if (called) return
                            called = true
                            resolvePromise(promise2, y, resolve, reject)
                        },
                        // 2.3.3.3.2 If/when rejectPromise is called with a reason r, reject promise with r.
                        r => {
                            if (called) return
                            called = true
                            reject(r)
                        }
                    )
                } catch (error) {
                    if (called) return
                    called = true
                    // 2.3.3.3.4 If calling then throws an exception e
                    reject(error)
                }
            }
        } catch (error) {
            // 2.3.3.2 If retrieving the property x.then results in a thrown exception e, reject promise with e as the reason.
            reject(error)
        }
    } else {
        // 2.3.4 If x is not an object or function, fulfill promise with x.
        return resolve(x)
    }
}

// promises-aplus-tests
MyPromise.deferred = function () {
    let result = {}
    result.promise = new MyPromise((resolve, reject) => {
        result.resolve = resolve
        result.reject = reject
    })
    return result
}

module.exports = MyPromise