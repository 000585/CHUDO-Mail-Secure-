const result = {
    ok(data = null, msg = 'success') {
        return { code: 200, data: data, msg: msg };
    },
    fail(msg = 'error', code = 500) {
        return { code: code, data: null, msg: msg };
    }
};

export default result;
