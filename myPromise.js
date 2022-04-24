class MyPromise {
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
        if (this._state === MyPromise.PENDING) {
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

    then(onFulfilled, onRejected) {
        onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : result => result
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
                setTimeout(() => {
                    try {
                        let x = onFulfilled(this._result)
                        resolvePromise(promise2, x, resolve, reject)
                    } catch (error) {
                        reject(error)
                    }
                })
            } else if (this._state === MyPromise.REJECTED) {
                setTimeout(() => {
                    try {
                        let x = onRejected(this._result)
                        resolvePromise(promise2, x, resolve, reject)
                    } catch (error) {
                        reject(error)
                    }
                })
            }
        })

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

function resolvePromise(promise2, x, resolve, reject) {
    if (x === promise2) {
        return reject(new TypeError('Chaining cycle detected for promise'))
    }

    if (x instanceof MyPromise) {
        if (x._state === MyPromise.PENDING) {
            x.then(
                y => resolvePromise(promise2, y, resolve, reject),
                reject
            )
        } else if (x._state === MyPromise.FULFILLED) {
            resolve(x._result)
        } else if (x._state === MyPromise.REJECTED) {
            reject(x._result)
        }
    } else if (x !== null && (typeof x === 'object' || typeof x === 'function')) {
        try {
            let then = x.then
            if (typeof then !== 'function') {
                resolve(x)
            } else {
                let called = false;
                try {
                    then.call(
                        x,
                        y => {
                            if (called) return
                            called = true
                            resolvePromise(promise2, y, resolve, reject)
                        },
                        r => {
                            if (called) return
                            called = true
                            reject(r)
                        }
                    )
                } catch (error) {
                    if (called) return
                    called = true
                    reject(error)
                }
            }
        } catch (error) {
            reject(error)
        }
    } else {
        return resolve(x)
    }
}

MyPromise.deferred = function () {
    let result = {}
    result.promise = new MyPromise((resolve, reject) => {
        result.resolve = resolve
        result.reject = reject
    })
    return result
}

module.exports = MyPromise