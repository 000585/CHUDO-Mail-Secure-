class BizError extends Error {
    constructor(message, code = 500) {
        super(message);
        this.name = 'BizError';
        this.code = code;
    }
}

export default BizError;
